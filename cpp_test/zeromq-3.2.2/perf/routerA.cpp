#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <zmq.h>
#include "zmq_utils.h"

int main(){
    const char *connect_to;
    void *ctx;
    void *s;
    int rc;
    void *watch;
    double elapsed;
    int n = 100000;

    connect_to = "tcp://127.0.0.1:5560";

    ctx = zmq_init (1);

    s = zmq_socket (ctx, ZMQ_ROUTER);
    
    zmq_setsockopt(s, ZMQ_IDENTITY, "R", 1);

    zmq_bind(s, connect_to);

    printf("Bound!\n");

    sleep(3);

    watch = zmq_stopwatch_start ();
    for(int i=0; i<n; i++){
        size_t message_size = sizeof("D"); 
        message_size = 1;       
        zmq_msg_t msg;
        zmq_msg_init_size (&msg, message_size);        
        memcpy(zmq_msg_data(&msg), "D", message_size);
        zmq_send (s, &msg, ZMQ_SNDMORE);        
        zmq_msg_close (&msg);

        message_size = sizeof("A");
        zmq_msg_init_size (&msg, message_size);
        memcpy(zmq_msg_data(&msg), "A", message_size);
        zmq_send (s, &msg, ZMQ_SNDMORE);        
        zmq_msg_close (&msg);

        message_size = sizeof("");
        zmq_msg_init_size (&msg, message_size);
        memcpy(zmq_msg_data(&msg), "", message_size);
        zmq_send (s, &msg, ZMQ_SNDMORE);        
        zmq_msg_close (&msg);

        message_size = sizeof("Hello");
        zmq_msg_init_size (&msg, message_size);
        memcpy(zmq_msg_data(&msg), "Hello", message_size);
        zmq_send (s, &msg, 0);        
        zmq_msg_close (&msg);

        //printf("send\n");
        //sleep(1);
    }
    elapsed = (double) zmq_stopwatch_stop (watch) / 1000000;
    double throughput = ((double) n / (double) elapsed ) / 1000000;

    printf ("elapsed time: %.3f [s]\n", elapsed);
    printf ("mean throughput: %.3fM [msg/s]\n", throughput);

    zmq_close (s);

    rc = zmq_term (ctx);
}