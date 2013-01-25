#include "zhelpers.hpp"

int main(){
	zmq::context_t context(1);
	zmq::socket_t client (context, ZMQ_ROUTER);
	client.setsockopt( ZMQ_IDENTITY, "A", 1);
	client.bind("tcp://*:5560");

	/*s_sendmore (client, "B");
	s_send(client, "");
	s_send (client, "This is the workload");*/
	std::string request;
	int total = 0;
	while(total < 1000 ){
		//s_dump(client);
		request = s_recv (client);
		total++;
	}
	sleep(1);
	return 0;
}
