# FREEDom Calculator

A comprehensive suite of financial calculators designed for educational purposes to help students and individuals understand important financial concepts and make informed financial decisions.

## Purpose

This project provides interactive, user-friendly calculators for various financial planning scenarios. Created by Mrs. Sewell from the FHU College of Business, these tools are designed to promote financial literacy and responsible financial decision-making (Financial Responsibility, Education, Empowerment, and Decision-making - FREED-om).

## Live Demo

Visit the live application: [https://mscottsewell.github.io/FREEDomCalculator/](https://mscottsewell.github.io/FREEDomCalculator/)

## Calculators

The application includes six comprehensive financial calculators:

### 1. **Inflation Calculator**
Calculate the impact of inflation on purchasing power over time. Understand how the value of money changes and plan accordingly for future expenses.

**Features:**
- Future nominal value calculation
- Real purchasing power estimation
- Percentage of purchasing power lost
- Visual chart showing purchasing power erosion over time

### 2. **Compound Interest Calculator**
Explore the power of compound interest for savings and investments. See how your money can grow over time with regular contributions.

**Features:**
- Initial deposit and regular contribution inputs
- Compound frequency options (monthly, quarterly, annually)
- Total savings and interest earned breakdown
- Visual representation of principal vs. interest growth

### 3. **Time Value of Money Calculator**
Solve for any variable in the Time Value of Money equation (N, I/Y, PV, PMT, FV). Essential for understanding present and future values of cash flows.

**Features:**
- Flexible input - solve for any variable
- Support for both investment and loan scenarios
- Cash flow convention guidance
- Visual chart showing investment or loan progression

### 4. **Credit Card Calculator**
Understand the true cost of credit card debt and compare different payment strategies. Learn how payment amounts affect total interest paid and payoff timelines.

**Features:**
- Current balance and interest rate inputs
- Compare minimum payment vs. custom payment amounts
- Detailed payment schedule (monthly and yearly views)
- Visual breakdown of principal vs. interest over time

### 5. **Auto Loan Calculator**
Calculate monthly payments and total interest for auto loans. Make informed decisions about vehicle financing.

**Features:**
- Loan amount, interest rate, and term inputs
- Monthly payment calculation
- Total interest and total amount paid
- Detailed payment schedule with yearly summaries

### 6. **Mortgage Calculator**
Plan for homeownership by calculating mortgage payments and understanding the long-term costs of home financing.

**Features:**
- Home price and down payment inputs
- Loan amount calculation based on down payment percentage
- Monthly payment breakdown
- Comprehensive payment schedules (monthly and yearly views)

## Technology Stack

- **Frontend Framework:** React 19 with TypeScript
- **Build Tool:** Vite
- **UI Components:** Radix UI primitives with custom styling
- **Charts:** Recharts for data visualization
- **Styling:** Tailwind CSS
- **Icons:** Phosphor Icons
- **State Management:** React hooks with GitHub Spark KV store for persistence
- **Deployment:** GitHub Pages

## Getting Started

### Prerequisites

- Node.js (version 18 or higher recommended)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mscottsewell/FREEDomCalculator.git
cd FREEDomCalculator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal)

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Deployment

To deploy to GitHub Pages:

```bash
npm run deploy
```

This will build the project and publish it to the `gh-pages` branch.

## Project Structure

```
FREEDomCalculator/
├── src/
│   ├── components/
│   │   ├── AutoLoanCalculator.tsx
│   │   ├── CompoundInterestCalculator.tsx
│   │   ├── CreditCardCalculator.tsx
│   │   ├── InflationCalculator.tsx
│   │   ├── MortgageCalculator.tsx
│   │   ├── TimeValueOfMoneyCalculator.tsx
│   │   └── ui/              # Reusable UI components
│   ├── lib/                 # Utility functions
│   ├── assets/              # Images and static assets
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── package.json
├── vite.config.ts
└── README.md
```

## Features

- **Responsive Design:** Works seamlessly on desktop, tablet, and mobile devices
- **Interactive Visualizations:** Charts and graphs help visualize financial data
- **State Persistence:** Your inputs are saved automatically
- **User-Friendly:** Clear labels, instructions, and validation messages
- **Educational Focus:** Includes context and explanations for financial concepts

## Educational Use

These calculators are designed for educational purposes to help students and individuals:
- Understand the time value of money
- Visualize the impact of interest rates
- Compare different financial scenarios
- Make informed borrowing and investing decisions
- Develop better financial literacy

## Contributing

Contributions are welcome! If you'd like to improve the calculators or add new features:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is intended for educational purposes.

## Acknowledgments

- Created by Mrs. Sewell for the FHU College of Business
- Built with modern web technologies to provide an accessible financial education tool
- Inspired by the need for practical financial literacy resources

## Contact

For questions or feedback about this project, please open an issue on GitHub.

---

**Remember:** These calculators are educational tools. For specific financial advice, always consult with a qualified financial advisor.
