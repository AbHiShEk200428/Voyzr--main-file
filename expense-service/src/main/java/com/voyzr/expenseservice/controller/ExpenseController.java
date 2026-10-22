package com.voyzr.expenseservice.controller;

import com.voyzr.expenseservice.entity.Expense;
import com.voyzr.expenseservice.entity.ExpenseSplit;
import com.voyzr.expenseservice.service.ExpenseService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
@Slf4j
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping("/trip/{tripId}")
    public ResponseEntity<List<Expense>> getExpenses(@PathVariable Long tripId) {
        log.info("GET /api/expenses/trip/{} - Fetching expenses", tripId);
        return ResponseEntity.ok(expenseService.getExpensesByTrip(tripId));
    }

    @GetMapping("/bulk")
    public ResponseEntity<List<Expense>> getExpensesByTrips(@RequestParam(name = "ids") List<Long> ids) {
        log.info("GET /api/expenses/bulk?ids={} - Fetching bulk expenses", ids);
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(expenseService.getExpensesByTrips(ids));
    }

    @PostMapping
    public ResponseEntity<Expense> addExpense(@RequestBody Expense expense, HttpServletRequest request) {
        log.info("POST /api/expenses - Adding new expense: {}", expense.getDescription());
        // Gateway injects X-User-Id header after validating JWT
        String xUserId = request.getHeader("X-User-Id");
        if (xUserId != null) {
            try {
                expense.setUserId(Long.parseLong(xUserId));
            } catch (NumberFormatException e) {
                log.warn("Could not parse X-User-Id header: {}", xUserId);
                expense.setUserId(1L); // fallback
            }
        } else {
            expense.setUserId(1L); // fallback for local testing
        }
        return ResponseEntity.ok(expenseService.addExpense(expense));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id) {
        log.info("DELETE /api/expenses/{} - Deleting expense", id);
        expenseService.deleteExpense(id);
        return ResponseEntity.ok().build();
    }

    // --- Enhanced Features ---

    @PutMapping("/{id}/settle")
    public ResponseEntity<Void> settleExpense(@PathVariable Long id) {
        log.info("PUT /api/expenses/{}/settle", id);
        expenseService.setSettlementStatus(id, Expense.SettlementStatus.SETTLED);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/unsettle")
    public ResponseEntity<Void> unsettleExpense(@PathVariable Long id) {
        log.info("PUT /api/expenses/{}/unsettle", id);
        expenseService.setSettlementStatus(id, Expense.SettlementStatus.PENDING);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/splits")
    public ResponseEntity<List<ExpenseSplit>> getSplits(@PathVariable Long id) {
        log.info("GET /api/expenses/{}/splits", id);
        return ResponseEntity.ok(expenseService.getExpenseSplits(id));
    }

    @PostMapping("/{id}/splits")
    public ResponseEntity<List<ExpenseSplit>> saveSplits(@PathVariable Long id, @RequestBody List<ExpenseSplit> splits) {
        log.info("POST /api/expenses/{}/splits - Saving {} splits", id, splits.size());
        return ResponseEntity.ok(expenseService.saveSplits(id, splits));
    }
}
