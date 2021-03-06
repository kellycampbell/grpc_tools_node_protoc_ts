#!/usr/bin/env node

import * as debug from "debug";
import * as grpc from "@grpc/grpc-js";
import {sendUnaryData} from "@grpc/grpc-js/build/src/server-call";

import {BookServiceService, IBookServiceServer} from "./proto/book_grpc_pb";
import { Book, GetBookRequest, GetBookViaAuthor } from "./proto/book_pb";

const log = debug("SampleServer");

class ServerImpl implements IBookServiceServer {

    public getBook(call: grpc.ServerUnaryCall<GetBookRequest, Book>, callback: sendUnaryData<Book>) {
        const book = new Book();

        book.setTitle("DefaultBook");
        book.setAuthor("DefaultAuthor");

        log(`[getBook] Done: ${JSON.stringify(book.toObject())}`);
        callback(null, book);
    }

    public getBooks(call: grpc.ServerDuplexStream<GetBookRequest, Book>) {
        call.on("data", (request: GetBookRequest) => {
            const reply = new Book();
            reply.setTitle(`Book${request.getIsbn()}`);
            reply.setAuthor(`Author${request.getIsbn()}`);
            reply.setIsbn(request.getIsbn());
            log(`[getBooks] Write: ${JSON.stringify(reply.toObject())}`);
            call.write(reply);
        });
        call.on("end", () => {
            log("[getBooks] Done.");
            call.end();
        });
    }

    public getBooksViaAuthor(call: grpc.ServerWritableStream<GetBookViaAuthor, Book>) {
        log(`[getBooksViaAuthor] Request: ${JSON.stringify(call.request.toObject())}`);
        for (let i = 1; i <= 10; i++) {
            const reply = new Book();
            reply.setTitle(`Book${i}`);
            reply.setAuthor(call.request.getAuthor());
            reply.setIsbn(i);
            log(`[getBooksViaAuthor] Write: ${JSON.stringify(reply.toObject())}`);
            call.write(reply);
        }
        log("[getBooksViaAuthor] Done.");
        call.end();
    }

    public getGreatestBook(call: grpc.ServerReadableStream<GetBookRequest, Book>, callback: sendUnaryData<Book>) {
        let lastOne: GetBookRequest;
        call.on("data", (request: GetBookRequest) => {
            log(`[getGreatestBook] Request: ${JSON.stringify(request.toObject())}`);
            lastOne = request;
        });
        call.on("end", () => {
            const reply = new Book();
            reply.setIsbn(lastOne.getIsbn());
            reply.setTitle("LastOne");
            reply.setAuthor("LastOne");
            log(`[getGreatestBook] Done: ${JSON.stringify(reply.toObject())}`);
            callback(null, reply);
        });
    }

}

function startServer() {
    const server = new grpc.Server();

    // @ts-ignore
    server.addService(BookServiceService, new ServerImpl());
    server.bindAsync("127.0.0.1:50051", grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            throw err;
        }
        log(`Server started, listening: 127.0.0.1:${port}`);
        server.start();
    });
}

startServer();

process.on("uncaughtException", (err) => {
    log(`process on uncaughtException error: ${err}`);
});

process.on("unhandledRejection", (err) => {
    log(`process on unhandledRejection error: ${err}`);
});
