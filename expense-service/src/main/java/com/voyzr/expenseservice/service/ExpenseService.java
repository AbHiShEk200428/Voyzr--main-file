package com.voyzr.expenseservice.service;

import com.voyzr.expenseservice.entity.Expense;
import com.voyzr.expenseservice.entity.ExpenseSplit;
import com.voyzr.expenseservice.repository.ExpenseRepository;
import com.voyzr.expenseservice.repository.ExpenseSplitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository splitRepository;

    public Expense addExpense(Expense expense) {
        log.info("Adding expense for trip {}", expense.getTripId());
        Expense savedExpense = expenseRepository.save(expense);
        
        // If the client sent splits in the request, save them now
        // This makes the frontend POST /api/expenses call atomic
        if (expense.getSplits() != null && !expense.getSplits().isEmpty()) {
            expense.getSplits().forEach(s -> s.setExpenseId(savedExpense.getId()));
            List<ExpenseSplit> savedSplits = splitRepository.saveAll(expense.getSplits());
            savedExpense.setSplits(savedSplits);
        }
        
        return savedExpense;
    }

    @Transactional(readOnly = true)
    public List<Expense> getExpensesByTrip(Long tripId) {
        List<Expense> expenses = expenseRepository.findByTripIdOrderByTimestampDesc(tripId);
        // eager load splits for UI
        expenses.forEach(e -> e.setSplits(splitRepository.findByExpenseId(e.getId())));
        return expenses;
    }

    @Transactional(readOnly = true)
    public List<Expense> getExpensesByTrips(List<Long> tripIds) {
        List<Expense> expenses = expenseRepository.findByTripIdIn(tripIds);
        // eager load splits
        expenses.forEach(e -> e.setSplits(splitRepository.findByExpenseId(e.getId())));
        return expenses;
    }

    public void deleteExpense(Long id) {
        splitRepository.deleteByExpenseId(id); // Clean up splits first
        expenseRepository.deleteById(id);
    }

    // --- New Enhanced Features ---

    public void setSettlementStatus(Long expenseId, Expense.SettlementStatus status) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found"));
        expense.setSettlementStatus(status);
        expenseRepository.save(expense);
    }

    public List<ExpenseSplit> saveSplits(Long expenseId, List<ExpenseSplit> splits) {
        // Verify expense exists
        if (!expenseRepository.existsById(expenseId)) {
            throw new RuntimeException("Expense not found");
        }
        
        // Remove old splits, replace with new
        splitRepository.deleteByExpenseId(expenseId);
        
        splits.forEach(s -> s.setExpenseId(expenseId));
        return splitRepository.saveAll(splits);
    }

    @Transactional(readOnly = true)
    public List<ExpenseSplit> getExpenseSplits(Long expenseId) {
        return splitRepository.findByExpenseId(expenseId);
    }
}
