#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <zmq.h>
#include <zmq.hpp> //zmq 2.2.0
#include <queue>
#include <json/json.h>

#include "/srv/server/cpp_test/zeromq-3.2.2/perf/zhelpers.hpp"

#include "/srv/server/cpp_test/zeromq-3.2.2/include/zmq_utils.h"

#define SOCK_ID_LEN 12 //nodeId-ServiceId-ServiceProcId, 3char for each field
#define SOCK_ADDR_LEN 28//22 //(incl null character)

using namespace std;

int main(int argc, char* argv[]){
	if(argc <= 2){
		printf("\n[Broker id] and [Master Broker address] needed!\nUsage:\t broker [broker id] [mnb address]\n\n");
		return 1;
	}

	const char* REQ_ADD_PEER = "ap";
	const char* REQ_REM_PEER = "rp";
	const char* REQ_UPD_PEER = "up";
	const char* REQ_CONFIG = "cf";
	const char* REQ_BOOT = "bt";

	const int MAX_PEERS = 10;

	void *ctx;

	void *local_front_socket;
	void *local_back_socket;
	void *cloud_front_socket;
	void *cloud_back_socket;
	void *control_socket;

	char local_front_addr[SOCK_ADDR_LEN];
	char local_back_addr[SOCK_ADDR_LEN];
	char cloud_front_addr[SOCK_ADDR_LEN];
	char cloud_back_addr[SOCK_ADDR_LEN];

	char local_front_id[SOCK_ID_LEN];
	char local_back_id[SOCK_ID_LEN];
	char cloud_front_id[SOCK_ID_LEN];
	char cloud_back_id[SOCK_ID_LEN];
	
	char *control_id = argv[1];
	char *control_addr = argv[2];

	char node_id[3];
	node_id[0] = control_id[0];
	node_id[1] = control_id[1];
	node_id[2] = control_id[2];

	char peer[MAX_PEERS];
	int peer_num = 0;
	char *peer_id[MAX_PEERS];

	queue<char*> worker_queue;

	int64_t more;
	size_t more_size = sizeof(more);
	zmq_msg_t msg_rcv;	
	zmq_msg_t msg_snd;
	size_t msg_rcv_size;
	size_t msg_snd_size;	
	char *worker;
	char *sender = (char*) malloc(SOCK_ID_LEN);
	bool is_first_msg = true;
	bool is_second_msg = false;
	bool is_local_rcv = true;
	bool is_local = true;
	bool can_rcv = false;

	int cloud_serve_rate = 4;
	int cloud_serve_rate_count = 0;
	int cloud_sending_rate = 10;
	int cloud_sending_rate_count = 0;

	int r = 1;
	int s = 1;

	ctx = zmq_init(1);
	
	//initializing sockets
	control_socket = zmq_socket(ctx, ZMQ_DEALER);
	zmq_setsockopt(control_socket, ZMQ_IDENTITY, control_id, SOCK_ID_LEN);
	zmq_connect(control_socket, control_addr);

	zmq_msg_init(&msg_snd);
	zmq_msg_init_size(&msg_snd, 13);
	memcpy(zmq_msg_data(&msg_snd), "{\"req\": \"bt\"}", 13);
	zmq_send(control_socket, &msg_snd, 0);

	printf("Broker %s up and waiting config from %s...\n", control_id, control_addr);	

	zmq_msg_init(&msg_rcv);
	zmq_recv(control_socket, &msg_rcv, 0);
	//zmq_getsockopt(local_front_socket, ZMQ_RCVMORE, &more, &more_size);
	char *m = (char*) malloc(zmq_msg_size(&msg_rcv));
	memcpy(m, zmq_msg_data(&msg_rcv), zmq_msg_size(&msg_rcv));
	zmq_msg_close(&msg_rcv);	

	printf("Configuration recived\n");

	Json::Value root;
	Json::Reader reader;
	bool parsingSuccessful = reader.parse(m, root);
	if(!parsingSuccessful){
		std::cout << "Failed to parse config" << std::endl;
		return 1;
	}

	strcpy(local_front_addr, root.get("lfa", "UTF-8" ).asString().c_str());
	strcpy(local_back_addr, root.get("lba", "UTF-8" ).asString().c_str());
	strcpy(cloud_front_addr, root.get("cfa", "UTF-8" ).asString().c_str());
	strcpy(cloud_back_addr, root.get("cba", "UTF-8" ).asString().c_str());

	strcpy(local_front_id, root.get("lfi", "UTF-8" ).asString().c_str());
	strcpy(local_back_id, root.get("lbi", "UTF-8" ).asString().c_str());
	strcpy(cloud_front_id, root.get("cfi", "UTF-8" ).asString().c_str());
	strcpy(cloud_back_id, root.get("cbi", "UTF-8" ).asString().c_str());

	printf("local frontend: %s %s\n", local_front_addr, local_front_id);
	printf("local backend: %s %s\n", local_back_addr, local_back_id);
	printf("cloud frontend: %s %s\n", cloud_front_addr, cloud_front_id);
	printf("cloud backend: %s %s\n", cloud_back_addr, cloud_back_id);
	
	local_front_socket = zmq_socket(ctx, ZMQ_ROUTER);
	zmq_setsockopt(local_front_socket, ZMQ_IDENTITY, local_front_id, SOCK_ID_LEN);
	zmq_bind(local_front_socket, local_front_addr);

	local_back_socket = zmq_socket(ctx, ZMQ_ROUTER);
	zmq_setsockopt(local_back_socket, ZMQ_IDENTITY, local_back_id, SOCK_ID_LEN);
	zmq_bind(local_back_socket, local_back_addr);

	cloud_front_socket = zmq_socket(ctx, ZMQ_ROUTER);
	zmq_setsockopt(cloud_front_socket, ZMQ_IDENTITY, cloud_front_id, SOCK_ID_LEN);
	zmq_bind(cloud_front_socket, cloud_front_addr);

	cloud_back_socket = zmq_socket(ctx, ZMQ_ROUTER);
	zmq_setsockopt(cloud_back_socket, ZMQ_IDENTITY, cloud_back_id, SOCK_ID_LEN);
	zmq_bind(cloud_back_socket, cloud_back_addr);

	printf("Bound!\n");

	zmq::pollitem_t items [] = {
		{local_front_socket, 0, ZMQ_POLLIN, 0},
		{local_back_socket, 0, ZMQ_POLLIN, 0},
		{cloud_front_socket, 0, ZMQ_POLLIN, 0},
		{cloud_back_socket, 0, ZMQ_POLLIN, 0},
		{control_socket, 0, ZMQ_POLLIN, 0}
	};

	delete[] m;
	m = (char*) malloc(sizeof("{reqId: }") + 10);

	sprintf(m, "{\"reqId\": %d}", root.get("reqId", "UTF-8" ).asInt());
	zmq_msg_init(&msg_snd);
	zmq_msg_init_size(&msg_snd, strlen(m));
	memcpy(zmq_msg_data(&msg_snd), m, strlen(m));	
	zmq_send(control_socket, &msg_snd, 0);	
	zmq_msg_close(&msg_snd);
	delete[] m;
	
	int count = 0;

	int i = 1;
	void *watch;
	void *watch2;
	unsigned long elapsed;
    double throughput;
    int message_count = 100000;

	while(1){

		zmq::poll(&items [0], 5, -1);

		//local_frontend
		if(items[0].revents & ZMQ_POLLIN){
			//printf("Reciving message from frontend\n");
			if(!worker_queue.empty()){
				can_rcv = true;
				is_local = true;
				worker = worker_queue.front();
				worker_queue.pop();
				if(++cloud_serve_rate_count == cloud_serve_rate)
					cloud_serve_rate_count = 0;
			}else{
				cloud_sending_rate_count++;
				//check cloud available peer
				if(peer_num > 0 & cloud_sending_rate_count > cloud_sending_rate){
					//TODO choose properly the worker to assign request
					worker = peer_id[0];
					can_rcv = true;
					is_local = false;
					cloud_sending_rate_count = 0;
					//printf("%s\n", worker);
				}else{
					can_rcv = false;
				}					
			}			
			//can_rcv = true;
			//worker = "001tsRW01002";
			if(can_rcv){
				printf("Reciving message from frontend\n");
				printf("%s\n", worker);
				/*count++;
				if(count == 1)
					watch2 = zmq_stopwatch_start ();
				//if(count % 10000 == 0)
				//	printf("%d %s\n", count, worker);
				if(count == message_count){
		            elapsed = zmq_stopwatch_stop (watch2);
		            throughput = ((double) message_count / (double) elapsed * 1000000) / 1000000;
		            printf (" Send mean throughput: %.3fM [msg/s]\n", throughput);
		            count = 0;
		        }
				/*if(is_local){
					printf(" <- local %d\n", cloud_serve_rate_count);
				}
				else
					printf(" <-|cloud| local %d\n", cloud_serve_rate_count);*/
				while(1){
					zmq_msg_init(&msg_rcv);
					zmq_recv(local_front_socket, &msg_rcv, 0);
					zmq_getsockopt(local_front_socket, ZMQ_RCVMORE, &more, &more_size);
								
					if(is_first_msg){					
						is_first_msg = false;
						//set destination address						
						msg_rcv_size = SOCK_ID_LEN;
						zmq_msg_init_size(&msg_snd, msg_rcv_size);
						memcpy(zmq_msg_data(&msg_snd), worker, msg_rcv_size);
						zmq_send(is_local ? local_back_socket : cloud_back_socket, &msg_snd, ZMQ_SNDMORE);
					}

					msg_rcv_size = zmq_msg_size(&msg_rcv);
					zmq_msg_init_size(&msg_snd, msg_rcv_size);
					printf("%s\n", (char*)zmq_msg_data(&msg_rcv));
					memcpy(zmq_msg_data(&msg_snd), zmq_msg_data(&msg_rcv), msg_rcv_size);
					zmq_send(is_local ? local_back_socket : cloud_back_socket, &msg_snd, more ? ZMQ_SNDMORE : 0);
					
					zmq_msg_close(&msg_rcv);	
					zmq_msg_close(&msg_snd);	
					//free worker

					if(!more){
						is_first_msg = true;
						break;
					}				
				}//while
			}//if(can_rcv)			
		}//if local_frontend


		//local_backend
		if(items[1].revents & ZMQ_POLLIN){
			printf("Reciving message from backend\n");
			//if(i == 1)
			//		watch = zmq_stopwatch_start ();

			while(1){
				
				zmq_msg_init(&msg_rcv);
				zmq_recv(local_back_socket, &msg_rcv, 0);				
				zmq_getsockopt(local_back_socket, ZMQ_RCVMORE, &more, &more_size);
			
				if(is_first_msg){			
					worker = (char*) malloc(SOCK_ID_LEN);		
					memcpy(worker, zmq_msg_data(&msg_rcv), SOCK_ID_LEN);
					worker_queue.push(worker);				
					is_first_msg = false;	
					is_second_msg = true;			
				}else{					
					msg_rcv_size = zmq_msg_size(&msg_rcv);	
					zmq_msg_init_size(&msg_snd, msg_rcv_size);					
					memcpy(zmq_msg_data(&msg_snd), zmq_msg_data(&msg_rcv), msg_rcv_size);				

					if(is_second_msg){
						printf("%s\n", (char*)zmq_msg_data(&msg_rcv));
						//check if is local or cloud client			
						//memcpy(sender, zmq_msg_data(&msg_rcv), SOCK_ID_LEN);			
						if(strncmp((char*)zmq_msg_data(&msg_rcv) , node_id, 3) == 0){						
						//if(strncmp(sender , node_id, 3) == 0){
							is_local_rcv = true;
							//printf(" r->local\n");
						}else{
							is_local_rcv = false;
							//printf(" r->cloud\n");
						}
						
						is_second_msg = false;
					}					
					zmq_send(is_local_rcv ? local_front_socket : cloud_front_socket, &msg_snd, more ? ZMQ_SNDMORE : 0);		
				}
				
				zmq_msg_close(&msg_rcv);
				zmq_msg_close(&msg_snd);

				if(!more){
					is_first_msg = true;
					is_local_rcv = true;
					break;
				}
			}

			/*if(i == message_count){
	            elapsed = zmq_stopwatch_stop (watch);
	            throughput = ((double) message_count / (double) elapsed * 1000000) / 1000000;
	            printf (" Recive mean throughput: %.3fM [msg/s]\n", throughput);
	            i = 0;
	        }
	        i++;*/
		}

		//cloud_frontend
		if(items[2].revents & ZMQ_POLLIN & (cloud_serve_rate_count == 0 || !(items[0].revents & ZMQ_POLLIN))){
			if(!worker_queue.empty()){
				can_rcv = true;
				worker = worker_queue.front();
				worker_queue.pop();
			}else{
				can_rcv = false;
			}			
			if(can_rcv){
				printf(" <- cloud %d %d\n", cloud_serve_rate_count, items[0].revents);
				while(1){
					zmq_msg_init(&msg_rcv);
					zmq_recv(cloud_front_socket, &msg_rcv, 0);
					zmq_getsockopt(cloud_front_socket, ZMQ_RCVMORE, &more, &more_size);
					
					if(is_first_msg){					
						is_first_msg = false;
						//set destination address
						//printf("->sending to %s %d\n\n", worker, strlen(worker));						
						msg_rcv_size = SOCK_ID_LEN;
						zmq_msg_init_size(&msg_snd, msg_rcv_size);
						memcpy(zmq_msg_data(&msg_snd), worker, msg_rcv_size);
						zmq_send(local_back_socket, &msg_snd, ZMQ_SNDMORE);
					}

					msg_rcv_size = zmq_msg_size(&msg_rcv);
					zmq_msg_init_size(&msg_snd, msg_rcv_size);
					memcpy(zmq_msg_data(&msg_snd), zmq_msg_data(&msg_rcv), msg_rcv_size);
					zmq_send(local_back_socket, &msg_snd, more ? ZMQ_SNDMORE : 0);

					zmq_msg_close(&msg_rcv);	
					zmq_msg_close(&msg_snd);	

					if(!more){
						is_first_msg = true;
						if(++cloud_serve_rate_count == cloud_serve_rate)
							cloud_serve_rate_count = 0;
						break;
					}				
				}	
			}		
		}

		//cloud_backend
		if(items[3].revents & ZMQ_POLLIN){
			printf("*Reciving message from cloud backend\n");
			is_first_msg = true;
			while(1){
				zmq_msg_init(&msg_rcv);
				zmq_recv(cloud_back_socket, &msg_rcv, 0);
				zmq_getsockopt(cloud_back_socket, ZMQ_RCVMORE, &more, &more_size);

				if(is_first_msg){						
					is_first_msg = false;					
				}else{
					msg_rcv_size = zmq_msg_size(&msg_rcv);
					zmq_msg_init_size(&msg_snd, msg_rcv_size);
					memcpy(zmq_msg_data(&msg_snd), zmq_msg_data(&msg_rcv), msg_rcv_size);
					zmq_send(local_front_socket, &msg_snd, more ? ZMQ_SNDMORE : 0);		
				}
				
				zmq_msg_close(&msg_rcv);
				zmq_msg_close(&msg_snd);

				if(!more){
					is_first_msg = true;
					break;
				}
			}
		}

		//control
		if(items[4].revents & ZMQ_POLLIN){
			printf("+ Reciving control message\n");
			is_first_msg = true;
			while(1){
				if(is_first_msg){
					is_first_msg = false;
				}else{
					printf("  Bad control message\n");
					break;
				}

				zmq_msg_init(&msg_rcv);
				zmq_recv(control_socket, &msg_rcv, 0);
				zmq_getsockopt(local_front_socket, ZMQ_RCVMORE, &more, &more_size);

				printf("%s\n", (char*)zmq_msg_data(&msg_rcv));
				m = (char*) malloc(zmq_msg_size(&msg_rcv));
				memcpy(m, zmq_msg_data(&msg_rcv), zmq_msg_size(&msg_rcv));
				zmq_msg_close(&msg_rcv);	

				Json::Value root;
				Json::Reader reader;
				bool parsingSuccessful = reader.parse(m, root);
				if(!parsingSuccessful){
					std::cout << "Failed to parse config" << std::endl;
					return 1;
				}
				if(root.get("req", "UTF-8").asString() == REQ_ADD_PEER){
					//char *peerAddr = (char*) malloc(root.get("addr", "UTF-8" ).asString().size());
					char *peerAddr = (char*) malloc(SOCK_ADDR_LEN);
					memcpy(peerAddr, root.get("addr", "UTF-8" ).asString().c_str(), SOCK_ADDR_LEN);					
					char *peer_uuid = (char*) malloc(SOCK_ID_LEN + 1);
					memcpy(peer_uuid, root.get("id", "UTF-8" ).asString().c_str(), SOCK_ID_LEN);		
					peer_uuid[SOCK_ID_LEN] = 0;
					bool ins = true;
					for(int i = 0; i < peer_num; i++)
						if(peer_id[i] == peer_uuid)
							ins = false;
					if(ins){
						peer_id[peer_num] = peer_uuid;
						zmq_connect(cloud_back_socket, peerAddr);
						peer_num++;
						printf("connected to %s %s\n", peerAddr, peer_uuid);						
					}					
				}
				if(root.get("req", "UTF-8").asString() == REQ_REM_PEER){
					for(int i = 0; i < peer_num; i++){
						if(root.get("id", "UTF-8").asString() == peer_id[i]){
							for(int j = 2; j < 8; j++)
    							peer_id[j] = peer_id[j + 1];			
    						peer_num--;
							printf("removed peer %s\n", root.get("id", "UTF-8").asString().c_str());					
							break;
						}
					}
				}
				if(root.get("req", "UTF-8").asString() == REQ_UPD_PEER){
					//TODO
				}

				zmq_msg_close(&msg_rcv);

				if(!more){
					is_first_msg = true;
					break;
				}
			}
		}
	}

	return 0;
}