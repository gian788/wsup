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

    
    for(int i=0; i<n; i++){
        if(i == 0)
            watch = zmq_stopwatch_start ();
        zmq_msg_t request;
        zmq_msg_init (&request);
        zmq_recv (s, &request, 0);
        //printf ("Received Hello\n");
        zmq_msg_close (&request);    
    }
    elapsed = (double) zmq_stopwatch_stop (watch) / 1000000;
    double throughput = ((double) n / (double) elapsed ) / 1000000;

    printf ("elapsed time: %.3f [s]\n", elapsed);
    printf ("mean throughput: %.3fM [msg/s]\n", throughput);

    zmq_close (s);

    rc = zmq_term (ctx);
}