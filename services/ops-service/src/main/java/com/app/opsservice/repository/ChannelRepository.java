package com.app.opsservice.repository;

import com.app.opsservice.model.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChannelRepository extends JpaRepository<Channel, Long> {

    List<Channel> findAllByOrderBySortOrderAsc();

    Optional<Channel> findByName(String name);
}
