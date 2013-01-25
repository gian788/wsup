#include "zhelpers.hpp"

#include "zmq_utils.h"

int main(int argc, char* argv[]){
	zmq::context_t context(1);
	zmq::socket_t client (context, ZMQ_DEALER);
    char *id = argv[1];
	//client.setsockopt( ZMQ_IDENTITY, "001tsRW01001", 12);
    client.setsockopt( ZMQ_IDENTITY, id, 12);
	//client.connect("tcp://127.0.0.1:55001");
    client.connect("ipc:///tmp/tsR_b");

	int total = 0;
	void *watch;
    unsigned long elapsed;
    double throughput;
    int message_count = 100000;

    std::string request;
    zmq_msg_t msg_snd;
    zmq_msg_t msg_rcv;
    int64_t more;
    size_t more_size = sizeof(more);
    size_t msg_rcv_size;
    size_t msg_snd_size;
    int flag = 0;
    /*while(1){
        s_dump(client);
    }*/

    zmq_msg_init(&msg_snd);
    zmq_msg_init_size(&msg_snd, 4);
    memcpy(zmq_msg_data(&msg_snd), "BOOT", 4);  
    zmq_send(client, &msg_snd, 0);


    //for(int i = 0; i < message_count; i++){
    int i = 1;
    while(1){   
        if(i == 1){
            watch = zmq_stopwatch_start ();
        }    
        while(1){
            zmq_msg_init(&msg_rcv);
            zmq_recv(client, &msg_rcv, 0);
            /*if(i == 1){
                printf("reciving\n");
            }*/
            zmq_getsockopt(client, ZMQ_RCVMORE, &more, &more_size);                
            
            /*msg_rcv_size = zmq_msg_size(&msg_rcv);
            zmq_msg_init_size(&msg_snd, msg_rcv_size);
            memcpy(zmq_msg_data(&msg_snd), zmq_msg_data(&msg_rcv), msg_rcv_size);
            zmq_send(client, &msg_snd, more ? ZMQ_SNDMORE : 0);*/
            zmq_send(client, &msg_rcv, more ? ZMQ_SNDMORE : 0);
                       
            zmq_msg_close(&msg_rcv);    
            //zmq_msg_close(&msg_snd);    

            if(!more){ 
                break;
            }               
        }//while
        if(i == message_count){
            elapsed = zmq_stopwatch_stop (watch);
            throughput = ((double) message_count / (double) elapsed * 1000000) / 1000000;
            printf ("mean throughput: %.3fM [msg/s]\n", throughput);
            i = 0;
        }
        i++;
    }

    elapsed = zmq_stopwatch_stop (watch);
    throughput = ((double) message_count / (double) elapsed * 1000000) / 1000000;
    printf ("mean throughput: %.3fM [msg/s]\n", throughput);
    sleep(1);
    return 0;
}



