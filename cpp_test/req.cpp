#include "zhelpers.hpp"


#include "../include/zmq.h"
#include "../include/zmq_utils.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../src/platform.hpp"

#if defined ZMQ_HAVE_WINDOWS
#include <windows.h>
#include <process.h>
#else
#include <pthread.h>
#endif

int main(){
	zmq::context_t context(1);

	zmq::socket_t client (context, ZMQ_REP);
	client.setsockopt( ZMQ_IDENTITY, "B", 1);
	client.connect("tcp://*:5560");
	std::cout << "connected!" << std::endl;
	sleep(1);
	void *watch;
    unsigned long elapsed;
    unsigned long throughput;
	watch = zmq_stopwatch_start ();
	for( int i = 0; i < 1000; i++){
		s_sendmore (client, "A");
		s_sendmore(client, "");
		s_send (client, "This is the workload");
	}
	elapsed = zmq_stopwatch_stop (watch);
	throughput = (unsigned long)
        ((double) message_count / (double) elapsed * 1000000);
    printf ("mean throughput: %d [msg/s]\n", (int) throughput);
	sleep(1);
	return 0;
}
