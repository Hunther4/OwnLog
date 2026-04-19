# Reports Dashboard Specification

## Purpose
Provide visual summaries of financial behavior to improve UX and data analysis, specifically optimized for low-end Android devices.

## Requirements

### Requirement: Category Expense Aggregation
The system MUST provide a mechanism to calculate the sum of amounts for all expense transactions, grouped by category, for the current filtered period.

#### Scenario: Distribution Calculation
- GIVEN a user has transactions: (Food: $50, Food: $20, Transport: $30)
- WHEN the aggregation is triggered
- THEN the system returns a dataset representing the correct distribution: `{ "Food": 70, "Transport": 30 }`

### Requirement: Monthly Spending Trend Aggregation
The system MUST calculate total expenses per month for a sliding window of the last 6 months, ensuring results are ordered chronologically.

#### Scenario: Trend Calculation
- GIVEN transactions in January ($100), February ($120), and March ($80)
- WHEN the trend aggregation is triggered
- THEN the system returns an ordered list of monthly totals: `[ { month: 'Jan', total: 100 }, { month: 'Feb', total: 120 }, { month: 'Mar', total: 80 } ]`

### Requirement: Reports Screen UI Layout
The `ReportsScreen` SHALL display a scrollable view containing:
1. A **Category Distribution Pie Chart** showing the percentage of spending per category.
2. A **Monthly Spending Bar Chart** showing total expenses over the last 6 months.

#### Scenario: Successful Rendering
- GIVEN the user has transactions across multiple months and categories
- WHEN the user navigates to the Reports screen
- THEN the screen displays both the Pie chart and the Bar chart with the correct aggregated data.

### Requirement: Empty State Handling
The system MUST display a dedicated "No Data Available" state when there are no transactions for the current aggregation period.

#### Scenario: New User Experience
- GIVEN a user with zero recorded transactions
- WHEN the user opens the Reports screen
- THEN the system hides the charts and displays a message: "No transactions found. Start adding some to see your reports!"

### Requirement: Low-End Android Performance (NFR)
To prevent UI freezes, all data aggregation MUST be performed on the database layer. The JS thread SHALL NOT iterate over raw transaction lists to calculate totals.

#### Scenario: Large Dataset Performance
- GIVEN a database with > 5,000 transactions
- WHEN the reports are loaded
- THEN the aggregation completes in < 100ms and the UI remains responsive.

### Requirement: Chart Responsiveness (NFR)
Charts MUST dynamically resize their width to match the device screen size and maintain a readable aspect ratio.

#### Scenario: Different Screen Sizes
- GIVEN the app is running on a small 5" screen and a large 7" tablet
- WHEN the charts are rendered
- THEN labels and segments remain legible and fit within the screen boundaries.
