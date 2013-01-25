#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <zmq.h>

int main(){
	const char *connect_to;
    void *ctx;
    void *s;
    int rc;

	connect_to = "tcp://127.0.0.1:5560";

	ctx = zmq_init (1);

    s = zmq_socket (ctx, ZMQ_DEALER);
    
    zmq_setsockopt(s, ZMQ_IDENTITY, "D", 1);

    zmq_connect(s, connect_to);

    printf("Connected!\n");

    while(1){
        zmq_msg_t request;
        zmq_msg_init (&request);
        zmq_recv (s, &request, 0);
        printf ("Received Hello\n");
        zmq_msg_close (&request);    	
    }

    zmq_close (s);

    rc = zmq_term (ctx);
}