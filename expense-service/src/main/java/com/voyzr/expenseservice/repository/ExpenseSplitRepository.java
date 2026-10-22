package com.voyzr.expenseservice.repository;

import com.voyzr.expenseservice.entity.ExpenseSplit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ExpenseSplitRepository extends JpaRepository<ExpenseSplit, Long> {

    List<ExpenseSplit> findByExpenseId(Long expenseId);

    List<ExpenseSplit> findByExpenseIdIn(List<Long> expenseIds);

    @Modifying
    @Query("DELETE FROM ExpenseSplit s WHERE s.expenseId = :expenseId")
    void deleteByExpenseId(@Param("expenseId") Long expenseId);
}
