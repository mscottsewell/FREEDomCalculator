# Mrs. Sewell's Financial FREEDom Calculators

A comprehensive suite of financial planning calculators designed for Personal Finance education. This modern, responsive web application provides six essential financial calculators with detailed visualizations and educational content.

![Financial Calculators Suite](./src/assets/images/FHU_COB.jpg)

## 🎯 Purpose

This application was built as an educational tool for personal finance classes, combining accurate financial calculations with clear explanations and engaging visualizations to help students understand key financial concepts.

## 📊 Features

### Six Comprehensive Calculators

1. **Inflation Calculator** 📈
   - Calculate how inflation affects purchasing power over time
   - Visualize purchasing power loss with area charts
   - Educational explanations of inflation impact

2. **Compound Interest Calculator** 🧮
   - Calculate investment growth with various compounding frequencies
   - Support for additional monthly/annual deposits
   - Interactive growth visualization showing principal vs. interest

3. **Time Value of Money Calculator** ⏰
   - Calculate any missing variable in TVM equations
   - Advanced Newton-Raphson methods for complex calculations
   - Educational explanations of time value concepts

4. **Credit Card Payoff Calculator** 💳
   - Calculate payoff time and total interest for credit card debt
   - Payment breakdown visualizations
   - Complete monthly payment schedule

5. **Auto Loan Calculator** 🚗
   - Calculate monthly car payments and total cost
   - Complete amortization schedule
   - Professional loan analysis

6. **Mortgage Calculator** 🏠
   - Calculate mortgage payments with home price and down payment inputs
   - Complete yearly amortization schedule
   - Comprehensive payment breakdown

## 🚀 Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom educational theme
- **UI Components**: shadcn/ui component library
- **Charts**: Recharts for data visualization
- **Icons**: Phosphor Icons React
- **Build Tool**: Vite
- **Data Persistence**: GitHub Spark's useKV hook for persistent storage
- **Typography**: Inter font for professional appearance

## 🎨 Design Philosophy

The application follows educational institution branding with:
- Professional blue/gray color scheme using OKLCH color space
- Clean, modern interface optimized for classroom use
- Responsive design working across all devices
- Accessible color contrasts meeting WCAG AA standards
- Mathematical precision with proper thousands separators

## 🧮 Mathematical Accuracy

All calculators use industry-standard financial formulas:
- Compound interest with proper compounding frequency handling
- Time value of money with Newton-Raphson method for complex calculations
- Accurate mortgage and loan amortization schedules
- Proper inflation calculations for purchasing power analysis

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd financial-calculators

# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser at http://localhost:5173
```

### Build for Production
```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── InflationCalculator.tsx
│   ├── CompoundInterestCalculator.tsx
│   ├── TimeValueOfMoneyCalculator.tsx
│   ├── CreditCardCalculator.tsx
│   ├── AutoLoanCalculator.tsx
│   └── MortgageCalculator.tsx
├── lib/
│   └── utils.ts               # Utility functions
├── assets/
│   └── images/
│       └── FHU_COB.jpg       # College logo
├── App.tsx                    # Main application component
├── index.css                  # Global styles and theme
└── main.tsx                   # Application entry point
```

## 🎯 Key Features

### Data Persistence
- All calculator inputs are automatically saved using GitHub Spark's useKV hook
- User data persists between browser sessions
- No account creation required

### Educational Focus
- Each calculator includes "Key Lesson" sections
- Clear explanations of financial concepts
- Professional presentation suitable for classroom use
- Real-world examples and context

### Visualizations
- Interactive area charts showing financial growth/decline over time
- Proper chart margins and responsive design
- Color-coded data for easy understanding
- Professional tooltips with formatted values

### User Experience
- Responsive tab navigation (2 columns on mobile, 6 on desktop)
- Large, clear icons for easy navigation
- Immediate calculation updates
- Professional error handling and validation

## 🎓 Educational Value

Each calculator reinforces key personal finance concepts:
- **Inflation**: Understanding purchasing power erosion
- **Compound Interest**: Power of early saving and investment
- **Time Value of Money**: Core financial planning principle
- **Credit Cards**: Cost of minimum payments
- **Loans**: Understanding amortization and total cost
- **Mortgages**: Home buying financial planning

## 🔧 Configuration

### Theme Customization
The application uses CSS custom properties for easy theming:
```css
:root {
  --primary: oklch(0.35 0.095 230);     /* Academic Navy */
  --secondary: oklch(0.88 0.015 220);   /* Light Gray */
  --accent: oklch(0.58 0.12 200);       /* Distinguished Blue */
  /* ... additional theme variables */
}
```

### Chart Colors
Educational chart colors are defined for consistency:
```css
--chart-1: oklch(0.58 0.12 200);  /* Academic Blue */
--chart-2: oklch(0.62 0.15 140);  /* Success Green */
--chart-3: oklch(0.68 0.13 45);   /* Warning Orange */
--chart-4: oklch(0.55 0.16 25);   /* Alert Red */
```

## 📊 Calculator Details

### Advanced Features
- **Newton-Raphson Method**: Used in Time Value of Money calculator for solving periods and interest rates
- **Flexible Compounding**: Support for annual, semi-annual, quarterly, monthly, weekly, and daily compounding
- **Additional Deposits**: Monthly and annual additional deposits in compound interest calculator
- **Dynamic Minimum Payments**: Credit card calculator supports both percentage-based and fixed payments
- **Complete Amortization**: Full payment schedules for all loan calculators

### Data Validation
- Input validation with helpful error messages
- Range checking for reasonable financial values  
- Automatic formatting with thousands separators
- Proper handling of edge cases and boundary conditions

## 🎯 Usage Tips

### For Educators
- Each calculator includes educational explanations
- Key lessons reinforce important financial concepts
- Professional presentation suitable for classroom display
- Charts and visualizations aid in concept explanation

### For Students
- Interactive learning with immediate feedback
- Real-world examples and scenarios
- Persistent data allows for experimentation
- Clear explanations of complex financial concepts

## 🔄 Future Enhancements

Potential areas for expansion:
- Additional calculators (retirement planning, investment comparison)
- Export functionality for calculations
- Print-friendly layouts
- Multi-language support
- Advanced chart types and analysis

## 📄 License

This project is designed for educational use in personal finance instruction.

## 🙋‍♂️ Support

For questions or issues related to the financial calculations or educational content, please refer to standard financial planning textbooks or consult with qualified financial professionals.

---

**Built with ❤️ for Personal Finance Education**