#include "../include/zmq.h"
#include "../include/zmq_utils.h"
#include <stdio.h>
#include <stdlib.h>


int main(){
	/*zmq::context_t context(1);

	zmq::socket_t client (context, ZMQ_PUSH);
	client.setsockopt( ZMQ_IDENTITY, "B", 1);
	client.connect("tcp://127.0.0.1:5560");
	std::cout << "connected!" << std::endl;
	sleep(1);*/
	void *watch;
    unsigned long elapsed;
    unsigned long throughput;
    int message_count = 1;
	watch = zmq_stopwatch_start ();
	/*for( int i = 0; i < message_count; i++){
		//s_sendmore (client, "A");
		//s_sendmore(client, "");		
		s_send (client, "This is the workload");
		//s_dump(client);
		//std::string string = s_recv (client);
		//zmq::message_t message;
        //client.recv(&message);
	}*/
	void *ctx;
    void *s;
    int rc;
    size_t message_size;    
    zmq_msg_t msg;

    ctx = zmq_init (1);
    if (!ctx) {
        printf ("error in zmq_init: %s\n", zmq_strerror (errno));
        return -1;
    }

    s = zmq_socket (ctx, ZMQ_PUSH);
    if (!s) {
        printf ("error in zmq_socket: %s\n", zmq_strerror (errno));
        return -1;
    }

    rc = zmq_connect (s, "tcp://127.0.0.1:12345");
    if (rc != 0) {
        printf ("error in zmq_bind: %s\n", zmq_strerror (errno));
        return -1;
    }

	for (int i = 0; i != message_count; i++) {

        rc = zmq_msg_init_size (&msg, message_size);
        if (rc != 0) {
            printf ("error in zmq_msg_init_size: %s\n", zmq_strerror (errno));
            return -1;
        }
#if defined ZMQ_MAKE_VALGRIND_HAPPY
        memset (zmq_msg_data (&msg), 0, message_size);
#endif

        rc = zmq_send (s, &msg, 0);
        if (rc < 0) {
            printf ("error in zmq_sendmsg: %s\n", zmq_strerror (errno));
            return -1;
        }
        rc = zmq_msg_close (&msg);
        if (rc != 0) {
            printf ("error in zmq_msg_close: %s\n", zmq_strerror (errno));
            return -1;
        }
    }



	elapsed = zmq_stopwatch_stop (watch);
	throughput = (unsigned long)
        ((double) message_count / (double) elapsed * 1000000);
    printf ("mean throughput: %d [msg/s]\n", (int) throughput);
	//sleep(1);
	return 0;
}
