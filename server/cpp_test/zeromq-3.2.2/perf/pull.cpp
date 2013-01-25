#include "../include/zmq.h"
#include "../include/zmq_utils.h"
#include <stdio.h>
#include <stdlib.h>

int main(){
	/*zmq::context_t context(1);
	zmq::socket_t client (context, ZMQ_PULL);
	client.setsockopt( ZMQ_IDENTITY, "A", 1);
	client.bind("tcp://127.0.0.1:5560");*/

	int total = 0;
	void *watch;
    unsigned long elapsed;
    unsigned long throughput;
    int message_count = 1;
    int rc;

     void *ctx;
    void *s;

    ctx = zmq_init (1);
    if (!ctx) {
        printf ("error in zmq_init: %s\n", zmq_strerror (errno));
        return -1;
    }

    s = zmq_socket (ctx, ZMQ_PULL);
    if (!s) {
        printf ("error in zmq_socket: %s\n", zmq_strerror (errno));
        return -1;
    }

    rc = zmq_bind (s, "tcp://127.0.0.1:12345");
    if (rc != 0) {
        printf ("error in zmq_bind: %s\n", zmq_strerror (errno));
        return -1;
    }

	//  Initialize poll set
    /*zmq::pollitem_t items [] = {
        { client,  0, ZMQ_POLLIN, 0 }
    };*/
    
    //  Switch messages between sockets
    zmq_msg_t msg;
    for (int i = 0; i != message_count - 1; i++) {
        rc = zmq_recv (s, &msg, 0);
        if(total == 0)
            watch = zmq_stopwatch_start ();
        total++;
    }


/*
    while(total < message_count ) {
        zmq::message_t message;
        int64_t more;           //  Multipart detection

        zmq::poll (&items [0], 1, -1);
        
        if (items [0].revents & ZMQ_POLLIN) {
            while (1) {
                //  Process all parts of the message
                client.recv(&message);
                size_t more_size = sizeof (more);
                client.getsockopt(ZMQ_RCVMORE, &more, &more_size);
                client.send(message, more? ZMQ_SNDMORE: 0);
                
                if (!more)
                    break;      //  Last message part
            }
            if(total == 0)
				watch = zmq_stopwatch_start ();
			total++;
        }
    }*/

    elapsed = zmq_stopwatch_stop (watch);
	throughput = (unsigned long)
        ((double) message_count / (double) elapsed * 1000000);
    printf ("mean throughput: %d [msg/s]\n", (int) throughput);

	//sleep(1);
	return 0;
}
