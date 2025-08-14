# Mrs. Sewell's Financial FREEDom Calculators

A comprehensive suite of educational financial calculators designed to teach personal finance concepts through interactive calculations and visualizations.

**Experience Qualities**: 
1. **Educational** - Clear explanations and real-world applications help students understand financial concepts deeply
2. **Professional** - Clean, academic interface suitable for classroom use with consistent branding and typography
3. **Interactive** - Immediate visual feedback through charts and calculations engage students in active learning

**Complexity Level**: Light Application (multiple features with basic state)
- Six distinct calculators with persistent data storage and visualization capabilities

## Essential Features

**Tab Navigation System**
- Functionality: Switch between six financial calculators using responsive tabs
- Purpose: Organize complex functionality into digestible sections for focused learning
- Trigger: User clicks calculator tab
- Progression: Tab click → calculator loads → inputs persist → calculations update → visualizations render
- Success criteria: All calculators accessible, smooth transitions, mobile responsive (2x3 grid)

**Inflation Calculator**
- Functionality: Calculate purchasing power loss over time with compound inflation effects
- Purpose: Demonstrate how inflation erodes money's value, crucial for long-term financial planning
- Trigger: User inputs current amount, inflation rate, years
- Progression: Input values → calculate future values → display results → render area chart showing purchasing power decline
- Success criteria: Accurate compound calculations, clear "What This Means" explanation with proper formatting

**Compound Interest Calculator** 
- Functionality: Calculate investment growth with configurable compounding frequency and additional deposits
- Purpose: Show the power of compound interest and regular investing for building wealth
- Trigger: User sets principal, rate, term, compounding frequency, additional deposits
- Progression: Input parameters → apply correct compound formula → calculate growth → display results with color coding → render area chart showing principal vs interest growth
- Success criteria: Mathematically accurate compound calculations respecting frequency, proper handling of additional deposits

**Time Value of Money Calculator**
- Functionality: Solve for any unknown variable in TVM equations using advanced algorithms
- Purpose: Teach fundamental concept that money today is worth more than money tomorrow
- Trigger: User selects variable to solve for and inputs known values
- Progression: Select solve variable → input known values → apply Newton-Raphson method → display result → show educational explanation
- Success criteria: Advanced mathematical accuracy for all TVM scenarios, proper handling of edge cases

**Credit Card Minimum Payment Calculator**
- Functionality: Calculate payoff timeline and total interest for credit card debt scenarios
- Purpose: Demonstrate the true cost of minimum payments and encourage debt reduction strategies
- Trigger: User inputs balance, APR, and payment method
- Progression: Input debt details → calculate payment schedule → display timeline results → render payment breakdown chart → show amortization table
- Success criteria: Accurate payment calculations, clear visualization of principal vs interest portions

**Auto Loan Calculator**
- Functionality: Calculate monthly payments and total costs for vehicle financing
- Purpose: Help students understand loan costs and make informed borrowing decisions
- Trigger: User inputs loan amount, interest rate, term
- Progression: Input loan parameters → calculate monthly payment → generate amortization schedule → display total costs
- Success criteria: Standard loan calculations, complete payment schedule, proper formatting

**Mortgage Calculator**
- Functionality: Calculate home loan payments with detailed amortization breakdown
- Purpose: Prepare students for major financial decisions in home ownership
- Trigger: User inputs mortgage amount, rate, term
- Progression: Input mortgage details → calculate payments → generate yearly amortization → display results
- Success criteria: Industry-standard mortgage calculations, year-by-year breakdown

## Edge Case Handling

- **Invalid inputs**: Clear error messages guide users to correct ranges and formats
- **Extreme values**: Handle very large numbers, long time periods, and edge interest rates gracefully
- **Division by zero**: Prevent crashes with appropriate validation and user feedback
- **Mobile responsiveness**: Ensure all calculators function properly on small screens
- **Data persistence**: Maintain user inputs across sessions and browser refreshes

## Design Direction

The design should feel academic yet modern - professional enough for classroom use while remaining approachable for students. Clean typography and consistent spacing create authority, while interactive charts and immediate feedback maintain engagement.

## Color Selection

Analogous blue-gray scheme conveys financial professionalism and educational authority.

- **Primary Color**: Deep Blue (oklch(0.45 0.12 250)) - Communicates trust, stability, and academic rigor
- **Secondary Colors**: Light Blue (oklch(0.85 0.04 250)) for backgrounds, Medium Gray (oklch(0.65 0.02 250)) for supporting elements
- **Accent Color**: Bright Blue (oklch(0.55 0.15 245)) - Draws attention to key actions and important results
- **Foreground/Background Pairings**: 
  - Primary (Deep Blue): White text (oklch(1 0 0)) - Ratio 8.2:1 ✓
  - Secondary (Light Blue): Dark Gray text (oklch(0.25 0.02 250)) - Ratio 6.1:1 ✓ 
  - Accent (Bright Blue): White text (oklch(1 0 0)) - Ratio 5.8:1 ✓
  - Background (White): Foreground (Dark Gray) - Ratio 12.1:1 ✓

## Font Selection

Inter font family conveys modern professionalism while maintaining excellent readability across all devices - essential for educational content with complex numerical data.

- **Typographic Hierarchy**:
  - H1 (App Title): Inter Bold/32px/tight letter spacing
  - H2 (Calculator Names): Inter SemiBold/24px/normal spacing  
  - H3 (Section Headers): Inter Medium/18px/normal spacing
  - Body (Instructions): Inter Regular/16px/relaxed line height
  - Numbers (Results): Inter Medium/18px/tabular figures

## Animations

Subtle transitions enhance the educational experience by providing visual continuity during calculator switches and result updates, maintaining focus on content rather than effects.

- **Purposeful Meaning**: Smooth tab transitions and gentle chart animations support learning flow without distraction
- **Hierarchy of Movement**: Chart updates and result highlighting draw attention to key educational moments

## Component Selection

- **Components**: Tabs for navigation, Cards for calculator sections, Input/Label pairs for form fields, Button for actions, Table for amortization schedules, custom chart components using Recharts
- **Customizations**: Enhanced Tab component with icons, specialized result display cards with color-coded values, responsive chart containers
- **States**: Input focus states for form guidance, loading states during complex calculations, error states with helpful messages
- **Icon Selection**: Financial icons from Phosphor Icons (Calculator, TrendUp, Timer, CreditCard, Car, House) for clear visual identification
- **Spacing**: Consistent 4/6/8 unit spacing scale, generous padding for readability, proper form field spacing
- **Mobile**: Tab navigation collapses to 2x3 grid, charts scale responsively, tables scroll horizontally with proper spacing