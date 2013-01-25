#include "zhelpers.hpp"
#include "zmq_utils.h"

int main(){
    zmq::context_t context(1);
    zmq::socket_t client (context, ZMQ_DEALER);
    client.setsockopt( ZMQ_IDENTITY, "C", 1);
    client.connect("tcp://127.0.0.1:5560");

    int total = 0;
    void *watch;
    unsigned long elapsed;
    double throughput;
    int message_count = 100000;

    std::string request;
    zmq_msg_t message;
    int64_t more;
    while(1){
        request = s_recv (client);
        const char* m = request.c_str();
        printf("  %s\n", m);   
        
        size_t more_size = sizeof (more);
        zmq_getsockopt (client, ZMQ_RCVMORE, &more, &more_size);     
        if (!more){
            printf("End message, Reply to %s\n-------------------\n", m);
        }
    }

    return 0;
}