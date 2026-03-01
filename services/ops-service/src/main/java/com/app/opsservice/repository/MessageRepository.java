package com.app.opsservice.repository;

import com.app.opsservice.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByChannelIdOrderByCreatedAtDesc(Long channelId, Pageable pageable);

    Page<Message> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT m FROM Message m WHERE " +
           "LOWER(m.content) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.author) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY m.createdAt DESC")
    Page<Message> search(@Param("query") String query, Pageable pageable);

    long countByChannelId(Long channelId);
}
