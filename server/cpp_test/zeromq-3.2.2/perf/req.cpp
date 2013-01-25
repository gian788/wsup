#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <zmq.h>

//#include "zhelpers.hpp"
#include "zmq_utils.h"


static void s_sleep (int msecs);
unsigned long send(int n);

int main(){	
    int n = 100000;
	double elapsed = ((double)send(n)) / 1000000;	
    double throughput = ((double) n / (double) elapsed ) / 1000000;

    printf ("elapsed time: %.3f [s]\n", elapsed);
    printf ("mean throughput: %.3f M [msg/s]\n", throughput);
	sleep(1);
	return 0;
}


unsigned long send(int n){

	const char *connect_to;
    void *ctx;
    void *s;
    int rc;
    int i;
    void *watch;
    unsigned long elapsed;
    double latency;

    connect_to = "ipc:///tmp/tsR_f";
    //connect_to = "tcp://127.0.0.1:55000";

	ctx = zmq_init (1);
    if (!ctx) {
        printf ("error in zmq_init: %s\n", zmq_strerror (errno));
        return -1;
    }

    s = zmq_socket (ctx, ZMQ_DEALER);
    //s = zmq_socket (ctx, ZMQ_ROUTER);
    if (!s) {
        printf ("error in zmq_socket: %s\n", zmq_strerror (errno));
        return -1;
    }

    zmq_setsockopt(s, ZMQ_IDENTITY, "001tsRC01001", 12);

    rc = zmq_connect (s, connect_to);
    //rc = zmq_bind (s, connect_to);
    if (rc != 0) {
        printf ("error in zmq_connect: %s\n", zmq_strerror (errno));
        return -1;
    }

    sleep(1);
    /*rc = zmq_msg_init_size (&msg, message_size);
    if (rc != 0) {
        printf ("error in zmq_msg_init_size: %s\n", zmq_strerror (errno));
        return -1;
    }
    memset (zmq_msg_data (&msg), 0, message_size);*/

    watch = zmq_stopwatch_start ();
    printf ("sending\n");
for(int j = 0; j < 10; j++){
    for (i = 0; i != n; i++) {  
        size_t message_size = sizeof("Hello");        
        zmq_msg_t msg;
        zmq_msg_init_size (&msg, message_size);        
        memcpy(zmq_msg_data(&msg), "Hello", message_size);
        zmq_send (s, &msg, 0);        
        zmq_msg_close (&msg);
/*
        zmq_msg_init_size (&msg, message_size);
        //memset (zmq_msg_data (&msg), 0, message_size);
        memcpy(zmq_msg_data(&msg), "part1", message_size);
        zmq_send (s, &msg, ZMQ_SNDMORE);        
        zmq_msg_close (&msg);

        message_size = sizeof("part2");
        zmq_msg_init_size (&msg, message_size);
        //memset (zmq_msg_data (&msg), 0, message_size);
        memcpy(zmq_msg_data(&msg), "part2", message_size);
        zmq_send (s, &msg, ZMQ_SNDMORE);        
        zmq_msg_close (&msg);

        message_size = sizeof("Ciao");//20;
        zmq_msg_init_size (&msg, message_size);
        //memset (zmq_msg_data (&msg), 0, message_size);
        memcpy(zmq_msg_data(&msg), "Ciao", message_size);
        zmq_send (s, &msg, 0);        
        zmq_msg_close (&msg);*/
    }
    sleep(2);
}

    elapsed = zmq_stopwatch_stop (watch);

    //calculate throughput
   
    //rc = zmq_msg_close (&msg);

    rc = zmq_close (s);
    if (rc != 0) {
        printf ("error in zmq_close: %s\n", zmq_strerror (errno));
        return -1;
    }

    rc = zmq_term (ctx);
    if (rc != 0) {
        printf ("error in zmq_term: %s\n", zmq_strerror (errno));
        return -1;
    }

    return elapsed;
}

//  Sleep for a number of milliseconds
static void
s_sleep (int msecs)
{
    struct timespec t;
    t.tv_sec = msecs / 1000;
    t.tv_nsec = (msecs % 1000) * 1000000;
    nanosleep (&t, NULL);

}