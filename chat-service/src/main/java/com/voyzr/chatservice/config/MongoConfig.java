package com.voyzr.chatservice.config;

import com.voyzr.chatservice.entity.ChatMessage;
import org.bson.Document;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Date;

@Configuration
public class MongoConfig {

    @Bean
    public MongoCustomConversions mongoCustomConversions() {
        // Must use a named class — lambdas don't work here because Spring Data
        // needs to resolve generic type arguments (Document → ChatMessage) via
        // reflection at startup. Lambdas cause type erasure → IllegalStateException.
        return new MongoCustomConversions(Arrays.asList(new ChatMessageReadConverter()));
    }

    /**
     * Reads a MongoDB BSON Document into a ChatMessage, handling BOTH:
     * - Old documents that stored the field as "ai" (pre-@Field fix)
     * - New documents that store the field as "isAi" (post-@Field fix)
     */
    static class ChatMessageReadConverter implements Converter<Document, ChatMessage> {

        @Override
        public ChatMessage convert(Document doc) {
            ChatMessage msg = new ChatMessage();

            // _id can be ObjectId or String
            Object rawId = doc.get("_id");
            msg.setId(rawId != null ? rawId.toString() : null);

            // tripId: stored as Long or Int32
            Long tripId = null;
            if (doc.getLong("tripId") != null) {
                tripId = doc.getLong("tripId");
            } else if (doc.getInteger("tripId") != null) {
                tripId = doc.getInteger("tripId").longValue();
            }
            msg.setTripId(tripId);

            msg.setSenderName(doc.getString("senderName"));
            msg.setSenderEmail(doc.getString("senderEmail"));
            msg.setContent(doc.getString("content"));

            // Timestamp: MongoDB stores LocalDateTime as a Date
            Object tsObj = doc.get("timestamp");
            if (tsObj instanceof Date date) {
                msg.setTimestamp(date.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime());
            } else if (tsObj instanceof LocalDateTime ldt) {
                msg.setTimestamp(ldt);
            }

            // Handle BOTH "ai" (old docs) and "isAi" (new docs)
            Boolean isAi = null;
            if (doc.get("isAi") != null) {
                isAi = doc.getBoolean("isAi");
            } else if (doc.get("ai") != null) {
                isAi = doc.getBoolean("ai");
            }
            msg.setAi(Boolean.TRUE.equals(isAi));

            return msg;
        }
    }
}
