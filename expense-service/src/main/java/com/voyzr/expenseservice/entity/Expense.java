package com.voyzr.expenseservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "expenses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tripId;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String paidBy; // display name of payer

    @Column(nullable = false)
    private String category;

    // Optional notes / tags
    @Column(columnDefinition = "TEXT")
    private String notes;

    // Base64 data URI of uploaded receipt image
    @Column(name = "receipt_url", columnDefinition = "TEXT")
    private String receiptUrl;

    // Settlement tracking
    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_status", nullable = false)
    @Builder.Default
    private SettlementStatus settlementStatus = SettlementStatus.PENDING;

    // How the expense is split
    @Enumerated(EnumType.STRING)
    @Column(name = "split_type", nullable = false)
    @Builder.Default
    private SplitType splitType = SplitType.EQUAL;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
        if (settlementStatus == null) {
            settlementStatus = SettlementStatus.PENDING;
        }
        if (splitType == null) {
            splitType = SplitType.EQUAL;
        }
    }

    public enum SettlementStatus {
        PENDING, SETTLED
    }

    public enum SplitType {
        EQUAL, CUSTOM
    }

    @Transient
    private java.util.List<ExpenseSplit> splits;
}
