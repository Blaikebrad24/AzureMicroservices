package com.app.opsservice.controller;

import com.app.opsservice.model.Channel;
import com.app.opsservice.model.Message;
import com.app.opsservice.model.MessagePriority;
import com.app.opsservice.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping("/channels")
    public ResponseEntity<List<Channel>> listChannels() {
        return ResponseEntity.ok(messageService.listChannels());
    }

    @GetMapping("/channels/counts")
    public ResponseEntity<Map<Long, Long>> getChannelCounts() {
        return ResponseEntity.ok(messageService.getChannelMessageCounts());
    }

    @GetMapping
    public ResponseEntity<Page<Message>> listMessages(
            @RequestParam(value = "channelId", required = false) Long channelId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(messageService.listMessages(channelId, pageable));
    }

    @PostMapping
    public ResponseEntity<Message> createMessage(@RequestBody Map<String, Object> body) {
        Long channelId = Long.valueOf(body.get("channelId").toString());
        String author = (String) body.get("author");
        String content = (String) body.get("content");
        MessagePriority priority = body.containsKey("priority") && body.get("priority") != null
                ? MessagePriority.valueOf((String) body.get("priority"))
                : MessagePriority.NORMAL;

        return ResponseEntity.ok(messageService.createMessage(channelId, author, content, priority));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<Page<Message>> search(
            @RequestParam("q") String query,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(messageService.search(query, pageable));
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getCount() {
        return ResponseEntity.ok(Map.of("count", messageService.getTotalMessageCount()));
    }
}
