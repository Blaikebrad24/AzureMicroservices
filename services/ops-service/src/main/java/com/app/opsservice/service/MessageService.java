package com.app.opsservice.service;

import com.app.opsservice.model.Channel;
import com.app.opsservice.model.Message;
import com.app.opsservice.model.MessagePriority;
import com.app.opsservice.repository.ChannelRepository;
import com.app.opsservice.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChannelRepository channelRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_PREFIX = "msg:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    public List<Channel> listChannels() {
        return channelRepository.findAllByOrderBySortOrderAsc();
    }

    public Map<Long, Long> getChannelMessageCounts() {
        List<Channel> channels = channelRepository.findAllByOrderBySortOrderAsc();
        Map<Long, Long> counts = new HashMap<>();
        for (Channel channel : channels) {
            counts.put(channel.getId(), messageRepository.countByChannelId(channel.getId()));
        }
        return counts;
    }

    public Page<Message> listMessages(Long channelId, Pageable pageable) {
        if (channelId != null) {
            return messageRepository.findByChannelIdOrderByCreatedAtDesc(channelId, pageable);
        }
        return messageRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Message createMessage(Long channelId, String author, String content, MessagePriority priority) {
        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new IllegalArgumentException("Channel not found: " + channelId));

        Message message = Message.builder()
                .channel(channel)
                .author(author)
                .content(content)
                .priority(priority != null ? priority : MessagePriority.NORMAL)
                .build();

        Message saved = messageRepository.save(message);
        redisTemplate.opsForValue().set(CACHE_PREFIX + saved.getId(), saved, CACHE_TTL);
        log.info("Created message: id={}, channel={}, author={}", saved.getId(), channel.getName(), author);
        return saved;
    }

    public void deleteMessage(Long id) {
        messageRepository.deleteById(id);
        redisTemplate.delete(CACHE_PREFIX + id);
        log.info("Deleted message: id={}", id);
    }

    public Page<Message> search(String query, Pageable pageable) {
        return messageRepository.search(query, pageable);
    }

    public long getTotalMessageCount() {
        return messageRepository.count();
    }
}
