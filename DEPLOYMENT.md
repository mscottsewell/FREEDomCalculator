# GitHub Pages Deployment Guide
## Financial FREEDom Calculators - Spark Project

This comprehensive guide will walk you through deploying the Financial FREEDom Calculators (a GitHub Spark project) to GitHub Pages, making it accessible to students and educators worldwide.

## 📋 Prerequisites

Before you begin, ensure you have:
- A GitHub account
- Git installed on your local machine
- Node.js 18+ installed
- Basic familiarity with command line/terminal

## ⚠️ Important: Spark Project Considerations

This is a **GitHub Spark project**, which means it has special dependencies and configurations that differ from standard Vite/React projects. Follow these instructions carefully to ensure proper deployment.

## 🚀 Step-by-Step Deployment Process

### Step 1: Prepare Your Repository

1. **Create a new PUBLIC repository on GitHub:**
   - Go to [github.com](https://github.com) and click "New repository"
   - Name it something descriptive like `financial-calculators` or `sewell-financial-tools`
   - **MUST be Public** (required for free GitHub Pages)
   - **Don't** initialize with README, .gitignore, or license (we'll add our own)
   - Click "Create repository"

2. **Get your project files ready:**
   - Ensure all your Spark project files are in a local folder
   - Verify that the `FHU_COB.jpg` image is in `src/assets/images/`
   - Confirm all calculator components are present

### Step 2: Configure the Project for Deployment

1. **Install GitHub Pages deployment tool:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json** (add/modify these sections):
   ```json
   {
     "name": "financial-freedom-calculators",
     "homepage": "https://YOUR_USERNAME.github.io/YOUR_REPO_NAME",
     "scripts": {
       "dev": "vite",
       "build": "tsc -b --noCheck && vite build",
       "preview": "vite preview",
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```
   
   **⚠️ Replace:**
   - `YOUR_USERNAME` with your actual GitHub username
   - `YOUR_REPO_NAME` with your repository name

3. **Create a production-ready vite.config.ts:**
   
   **IMPORTANT:** This replaces your existing vite.config.ts for deployment:
   
   ```typescript
   import tailwindcss from "@tailwindcss/vite";
   import react from "@vitejs/plugin-react-swc";
   import { defineConfig } from "vite";
   import { resolve } from 'path';

   // Production config for GitHub Pages deployment
   export default defineConfig({
     plugins: [
       react(),
       tailwindcss(),
     ],
     base: '/YOUR_REPO_NAME/', // CRITICAL: Replace with your repo name
     resolve: {
       alias: {
         '@': resolve(import.meta.dirname, 'src')
       }
     },
     build: {
       outDir: 'dist',
       assetsDir: 'assets',
       sourcemap: false,
       minify: 'terser',
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             charts: ['recharts', 'd3']
           }
         }
       }
     }
   });
   ```

### Step 3: Prepare Spark-Specific Adjustments

Since this is a Spark project, we need to handle the special Spark dependencies:

1. **Create a deployment-specific package.json** that removes Spark-specific dependencies:
   ```bash
   # Create a backup of your original package.json
   cp package.json package.json.spark-backup
   ```

2. **Update dependencies for deployment:**
   Remove these Spark-specific packages from dependencies (they won't work in GitHub Pages):
   - `@github/spark`
   - Any Spark-related plugins

3. **Create a simplified version of components** that don't use Spark-specific APIs:
   - Replace `useKV` with `localStorage` for deployment
   - Remove any `spark.llm` or other Spark API calls

### Step 4: Create a Deployment-Ready Version

1. **Create a deployment branch setup:**
   ```bash
   # Initialize git repository (if not already done)
   git init
   git branch -M main
   
   # Add your GitHub repository as origin
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

2. **Test the build process:**
   ```bash
   # Install dependencies
   npm install
   
   # Test build locally
   npm run build
   
   # Preview the built version
   npm run preview
   ```
   
   Visit the preview URL and verify:
   - ✅ All calculators load and function correctly
   - ✅ Charts and visualizations appear properly
   - ✅ FHU logo displays correctly
   - ✅ Responsive design works on different screen sizes
   - ✅ All calculations produce correct results

### Step 5: Deploy to GitHub Pages

1. **Commit and push your code:**
   ```bash
   git add .
   git commit -m "Initial commit: Financial FREEDom Calculators for deployment"
   git push -u origin main
   ```

2. **Deploy to GitHub Pages:**
   ```bash
   npm run deploy
   ```
   
   This command will:
   - Build your project (`npm run build`)
   - Create a `gh-pages` branch
   - Upload the `dist` folder contents to that branch
   - Push to GitHub

3. **Enable GitHub Pages in repository settings:**
   - Go to your repository on GitHub
   - Click "Settings" tab
   - Scroll to "Pages" section in the left sidebar
   - Under "Source": Select "Deploy from a branch"
   - Under "Branch": Choose `gh-pages` and `/ (root)`
   - Click "Save"

### Step 6: Verify Deployment

After 5-10 minutes, your site should be live at:
`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

**Check that everything works:**
- [ ] Site loads without errors
- [ ] All 6 calculator tabs are accessible
- [ ] FHU logo displays correctly
- [ ] Charts render properly
- [ ] Calculations work accurately
- [ ] Data persists between page refreshes
- [ ] Mobile/responsive design functions
- [ ] All styling appears correctly

## 🔧 Alternative Deployment Methods (Advanced)

### Method 1: GitHub Actions with Spark Adaptations

**Note:** This method requires additional configuration to handle Spark-specific dependencies.

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Financial Calculators to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build for production
      run: npm run build
      env:
        NODE_ENV: production
    
    - name: Setup Pages
      uses: actions/configure-pages@v4
    
    - name: Upload artifact
      uses: actions/upload-pages-artifact@v3
      with:
        path: './dist'
    
    - name: Deploy to GitHub Pages
      id: deployment
      uses: actions/deploy-pages@v4
```

### Method 2: Manual Build and Upload

For non-technical users who prefer uploading files:

1. **Build the project locally:**
   ```bash
   npm run build
   ```
   
   This creates a `dist` folder with all the files needed for deployment.

2. **Upload to GitHub Pages manually:**
   - Go to your GitHub repository
   - Switch to the `gh-pages` branch (create it if it doesn't exist)
   - Delete all existing files in the branch
   - Upload all files from your local `dist` folder to the root of the `gh-pages` branch
   - Commit the changes with a message like "Update calculators deployment"

3. **Enable GitHub Pages** (same as main method Step 6)

## ⚡ Handling Spark-Specific Features

This project was originally built as a GitHub Spark, which includes special features that need adaptation for standard deployment:

### Data Persistence (useKV → localStorage)

The original project uses Spark's `useKV` for data persistence. For GitHub Pages deployment, create a compatibility layer:

Create `src/hooks/useKVFallback.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useKV<T>(key: string, defaultValue: T): [T, (value: T | ((current: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }, [key, value]);

  const updateValue = (newValue: T | ((current: T) => T)) => {
    setValue(current => {
      const result = typeof newValue === 'function' 
        ? (newValue as (current: T) => T)(current)
        : newValue;
      return result;
    });
  };

  const deleteValue = () => {
    try {
      localStorage.removeItem(key);
      setValue(defaultValue);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  };

  return [value, updateValue, deleteValue];
}
```

Then replace all imports in your calculator components:
```typescript
// Replace this:
import { useKV } from '@github/spark/hooks'

// With this:
import { useKV } from '@/hooks/useKVFallback'
```

## 🛠️ Configuration Details & Troubleshooting

### Critical Configuration Files

#### 1. `vite.config.ts` (Production Version)
```typescript
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { resolve } from 'path';

  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/YOUR_REPO_NAME/', // MUST match your GitHub repository name
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser'
  }
});
```

#### 2. `package.json` Updates
```json
{
  "homepage": "https://YOUR_USERNAME.github.io/YOUR_REPO_NAME",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

#### 3. Asset Import Verification
All assets MUST use import statements (not string paths):
```typescript
// ✅ CORRECT
import logo from '@/assets/images/FHU_COB.jpg'
<img src={logo} alt="Logo" />

// ❌ WRONG - Will break on GitHub Pages
<img src="/src/assets/images/FHU_COB.jpg" alt="Logo" />
```

### Common Issues and Solutions

#### Issue 1: Blank White Page
**Symptoms:** Site loads but shows only a blank page
**Cause:** Incorrect `base` path in vite.config.ts
**Solution:** 
```typescript
// In vite.config.ts, ensure base matches your repo name EXACTLY
base: '/financial-calculators/', // Must include leading and trailing slashes
```

#### Issue 2: 404 Errors for Assets
**Symptoms:** Images, fonts, or other assets not loading
**Solutions:**
1. Verify all assets use import statements
2. Check that `FHU_COB.jpg` exists in `src/assets/images/`
3. Rebuild and redeploy:
   ```bash
   npm run build
   npm run deploy
   ```

#### Issue 3: JavaScript/React Errors
**Symptoms:** Console errors, broken functionality
**Solutions:**
1. Check for Spark-specific code that needs adaptation
2. Ensure all dependencies are compatible with standard React
3. Test locally first:
   ```bash
   npm run build
   npm run preview
   ```

#### Issue 4: Calculator Data Not Persisting
**Symptoms:** Input values don't save between page refreshes
**Solution:** Implement localStorage fallback (see Spark adaptations above)

#### Issue 5: Deploy Command Fails
**Solutions:**
```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install

# Try deploying again
npm run deploy

# If still failing, check for build errors:
npm run build
```

### Verification Checklist

After deployment, verify these items work correctly:

**✅ Basic Functionality:**
- [ ] Site loads at `https://USERNAME.github.io/REPO_NAME/`
- [ ] All 6 calculator tabs are clickable and switch properly
- [ ] FHU College of Business logo displays correctly
- [ ] Page title shows "Mrs. Sewell's Financial FREEDom Calculators"

**✅ Calculator Functions:**
- [ ] Inflation Calculator: Calculations are accurate, chart displays
- [ ] Compound Interest: Respects compounding frequency, chart shows data
- [ ] Time Value of Money: Can solve for different variables
- [ ] Credit Card: Shows payoff schedule and chart
- [ ] Auto Loan: Displays amortization schedule
- [ ] Mortgage: Shows payment breakdown with home price/down payment

**✅ Visual Elements:**
- [ ] Charts render without being cut off
- [ ] Tables display with proper formatting
- [ ] Responsive design works on mobile devices
- [ ] Color scheme matches educational branding
- [ ] Key Lesson sections display with larger text

**✅ Data Persistence:**
- [ ] Input values save when switching between tabs
- [ ] Data persists after page refresh
- [ ] No error messages in browser console

### Performance Optimization

Once deployed, consider these optimizations:

1. **Image Optimization:**
   ```bash
   # Optimize the FHU_COB.jpg file size if needed
   # Recommended: Keep under 100KB for faster loading
   ```

2. **Caching Strategy:**
   GitHub Pages automatically provides good caching for static assets

3. **Loading Speed:**
   - The tab-based interface already provides lazy loading
   - Charts load only when their tab is active
   - Assets are bundled efficiently by Vite

## 🎯 Sharing & Using Your Deployed Site

### For Educators

**Direct Access:**
- **URL:** `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`
- **QR Code:** Generate a QR code pointing to your URL for easy mobile access
- **LMS Integration:** 
  - Canvas: Add as an external tool or embed in course content
  - Blackboard: Link from course materials or assignments
  - Google Classroom: Share as a resource link

**Classroom Usage:**
- Works on all devices without installation
- Students can bookmark for easy access
- Data saves automatically for continuous use
- Professional appearance suitable for academic environments

### For Students

**Access Instructions:**
1. Bookmark the GitHub Pages URL for quick access
2. Works on phones, tablets, and computers
3. No downloads or installations required
4. Your input data saves automatically
5. Use any modern web browser (Chrome, Firefox, Safari, Edge)

**Study Tips:**
- Each calculator includes "Key Lessons" for better understanding
- Try different scenarios to see how variables affect outcomes
- Use the visualization charts to understand financial concepts
- Compare results across different calculators to see relationships

## 🔄 Updating Your Deployed Site

### Making Changes

1. **Modify files locally** using your preferred code editor
2. **Test changes thoroughly:**
   ```bash
   npm run build
   npm run preview
   ```
3. **Deploy updates:**
   ```bash
   git add .
   git commit -m "Update: describe your changes"
   git push origin main
   npm run deploy
   ```

### Version Control Best Practices

```bash
# Create meaningful commit messages
git commit -m "Fix: Corrected mortgage calculation formula"
git commit -m "Update: Added new Key Lesson to inflation calculator"
git commit -m "Style: Improved mobile responsive design"

# Tag important releases
git tag -a v1.0 -m "Initial public release"
git push origin v1.0
```

## 🆘 Getting Help & Support

### Self-Help Resources

1. **Check the browser console** for error messages (F12 → Console tab)
2. **Verify deployment status** on GitHub:
   - Go to repository → Settings → Pages
   - Check that source is set to "gh-pages" branch
   - Look for deployment status indicators

3. **Test locally first:**
   ```bash
   npm run build && npm run preview
   ```

### Documentation Links

- **GitHub Pages:** [docs.github.com/pages](https://docs.github.com/en/pages)
- **Vite Build Tool:** [vitejs.dev/guide/build.html](https://vitejs.dev/guide/build.html)
- **React Documentation:** [react.dev](https://react.dev)

### Common Support Scenarios

**"My site isn't updating"**
- GitHub Pages can take 5-10 minutes to update
- Try a hard browser refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check that the `gh-pages` branch has your latest changes

**"Calculations seem wrong"**
- Test the same inputs on the local version first
- Compare with known financial calculators online
- Check browser console for JavaScript errors

**"Charts aren't displaying"**
- Verify chart data is loading (check browser console)
- Ensure responsive design isn't hiding charts on mobile
- Try refreshing the page or switching tabs

## 🎉 Success! Your Site is Live

### What You've Accomplished

✅ **Professional Financial Education Tool:** Your calculators are now accessible 24/7 to students worldwide

✅ **Zero Maintenance Hosting:** GitHub Pages provides reliable, free hosting with global CDN

✅ **Mobile-Friendly Design:** Students can access calculators on any device, anywhere

✅ **Educational Impact:** Six comprehensive calculators with explanations and visualizations

✅ **Data Persistence:** Student inputs save automatically for continuous learning

### Next Steps

1. **Share with students:** Provide the GitHub Pages URL in your syllabus and course materials

2. **Monitor usage:** Consider adding Google Analytics to track how students use the tools

3. **Gather feedback:** Ask students which calculators they find most helpful

4. **Iterate and improve:** Use student feedback to enhance the calculators over time

## 🚀 Advanced Features (Optional)

### Custom Domain Setup

If your institution wants a custom domain (like `calculators.university.edu`):

1. **Purchase/configure domain** with your institution's IT department
2. **Add CNAME file** to your repository root:
   ```
   calculators.university.edu
   ```
3. **Configure DNS** with your domain provider to point to GitHub Pages
4. **Enable HTTPS** in GitHub Pages settings

### Analytics Integration

Track student usage with Google Analytics:

1. **Create Google Analytics 4 property**
2. **Add tracking code to `index.html`:**
   ```html
   <!-- Google Analytics -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'GA_MEASUREMENT_ID');
   </script>
   ```
3. **Monitor:** See which calculators are most used and when students are most active

### Backup and Recovery

**Automatic Backups:**
- Your code is automatically backed up in your GitHub repository
- The `gh-pages` branch contains your deployed site
- GitHub provides 99.9% uptime for Pages hosting

**Manual Backups:**
```bash
# Create a backup of your repository
git clone --mirror https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git backup-repo
```

---

## 📚 Educational Impact Statement

**Your Financial FREEDom Calculators are now empowering students with:**

- **Real-world application** of personal finance concepts
- **Visual learning** through interactive charts and graphs  
- **Practical skills** for making informed financial decisions
- **24/7 accessibility** for learning at their own pace
- **Professional tools** that mirror industry standards

**Students worldwide now have access to professional-grade financial planning tools! 🎓💰📊**