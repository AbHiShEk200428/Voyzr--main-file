package com.voyzr.expenseservice.config;

import com.voyzr.expenseservice.entity.Expense;
import com.voyzr.expenseservice.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Automatically fixes existing database records that are missing a userId.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class DatabaseMigrator implements CommandLineRunner {

    private final ExpenseRepository expenseRepository;

    @Override
    public void run(String... args) {
        log.info("Checking for expenses missing user IDs...");
        
        List<Expense> allExpenses = expenseRepository.findAll();
        long fixedCount = 0;

        for (Expense expense : allExpenses) {
            if (expense.getUserId() == null) {
                expense.setUserId(1L); // Assign to default admin user
                expenseRepository.save(expense);
                fixedCount++;
            }
        }

        if (fixedCount > 0) {
            log.info("Migration complete: Fixed {} expenses.", fixedCount);
        } else {
            log.info("No migration needed.");
        }
    }
}
