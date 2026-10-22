package com.voyzr.expenseservice.repository;

import com.voyzr.expenseservice.entity.Expense;
import com.voyzr.expenseservice.entity.Expense.SettlementStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByTripIdOrderByTimestampDesc(Long tripId);
    List<Expense> findByTripIdIn(List<Long> tripIds);
    List<Expense> findByTripIdAndSettlementStatus(Long tripId, SettlementStatus status);
}
