import React, { useEffect, useState, useRef } from "react";
import { chatSocket } from "../services/socket";
import { useAuth } from "../features/auth/AuthContext";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { Button } from "../components/ui/button";

export default function ChatWindow({ rideId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!rideId) return;

    const handleConnect = () => {
      console.log("[CHAT_SOCKET] Connect callback. Joining room: chat:" + rideId);
      setConnected(true);
      chatSocket.emit("join_chat", { rideId });
    };

    console.log("[CHAT_SOCKET] Connect initiated for rideId:", rideId);
    chatSocket.connect();

    // If socket is already connected (e.g. from hot-reload, fast-navigation, or Double Mount)
    if (chatSocket.connected) {
      console.log("[CHAT_SOCKET] Socket already connected. Joining room immediately.");
      handleConnect();
    }

    chatSocket.on("connect", handleConnect);

    chatSocket.on("disconnect", () => {
      console.log("[CHAT_SOCKET] Socket disconnected");
      setConnected(false);
    });

    // Handle initial history payload
    chatSocket.on("message_history", (history) => {
      console.log("[CHAT_SOCKET] Message history loaded, count:", history.length);
      setMessages(history);
      setTimeout(scrollToBottom, 100);
    });

    // Handle new incoming messages
    chatSocket.on("receive_message", (newMessage) => {
      console.log("[CHAT_SOCKET] receive_message event fired, payload:", newMessage);
      setMessages((prev) => [...prev, newMessage]);
      setTimeout(scrollToBottom, 50);
    });

    return () => {
      console.log("[CHAT_SOCKET] Cleaning up and disconnecting...");
      chatSocket.off("connect", handleConnect);
      chatSocket.off("disconnect");
      chatSocket.off("message_history");
      chatSocket.off("receive_message");
      chatSocket.disconnect();
    };
  }, [rideId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !connected) return;

    chatSocket.emit("send_message", {
      rideId,
      senderId: user.id || user._id,
      senderName: user.name || "Anonymous",
      text: text.trim(),
    });

    setText("");
  };

  return (
    <div
      id="chat-window"
      className="flex flex-col h-full rounded-3xl border border-border/40 bg-card/35 backdrop-blur-md overflow-hidden shadow-soft"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/30 bg-background/20 px-5 py-3.5">
        <MessageSquare className="size-4 text-primary animate-pulse" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">Ride Coordinator</h3>
          <span className="text-[10px] text-muted-foreground">
            {connected ? "Connected to ride room" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="flex size-10 items-center justify-center rounded-full bg-accent text-muted-foreground mb-2">
              <MessageSquare className="size-5" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold">No messages yet</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              coordinate pickup spots and timelines here
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const currentUserId = user?.id || user?._id;
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg._id || Math.random().toString()}
                className={`flex flex-col max-w-[75%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                <span className="text-[9px] font-bold text-muted-foreground mb-0.5 px-1 truncate max-w-[120px]">
                  {isMe ? "You" : msg.senderName}
                </span>
                <div
                  className={`rounded-2xl px-3.5 py-2 text-xs transition-smooth ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-background/45 border border-border/30 text-foreground rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[8px] text-muted-foreground/60 mt-0.5 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Form Input */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-border/30 bg-background/20 p-3 flex gap-2"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={connected ? "Type message..." : "Connecting to chat..."}
          disabled={!connected}
          className="flex-1 bg-background/30 rounded-xl border border-border/40 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-smooth focus:border-primary/50 focus:bg-background/50 focus:ring-1 focus:ring-ring/10"
        />
        <Button
          type="submit"
          disabled={!text.trim() || !connected}
          size="icon"
          className="rounded-xl shrink-0"
        >
          <Send className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}
