# PowerShell script to setup Git repository for PileTrackerPro

Write-Host "PileTrackerPro Git Setup Script" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""

# Check if Git is installed
$gitInstalled = $null
try {
    $gitInstalled = Get-Command git -ErrorAction Stop
    Write-Host "Git is installed at: $($gitInstalled.Path)" -ForegroundColor Green
} catch {
    Write-Host "Git is not installed. Please install Git from https://git-scm.com/downloads" -ForegroundColor Red
    Write-Host "After installing Git, close and reopen PowerShell, then run this script again." -ForegroundColor Yellow
    exit
}

# Initialize Git repository
Write-Host "Initializing Git repository..." -ForegroundColor Cyan
git init

# Configure Git user if not already set
$gitUser = git config --global user.name
$gitEmail = git config --global user.email

if (-not $gitUser) {
    $gitUser = Read-Host "Enter your name for Git commits"
    git config --global user.name "$gitUser"
}

if (-not $gitEmail) {
    $gitEmail = Read-Host "Enter your email for Git commits"
    git config --global user.email "$gitEmail"
}

Write-Host "Git configured with user: $gitUser <$gitEmail>" -ForegroundColor Green

# Add all files to Git
Write-Host "Adding files to Git..." -ForegroundColor Cyan
git add .

# Make initial commit
Write-Host "Creating initial commit..." -ForegroundColor Cyan
git commit -m "Initial commit of PileTrackerPro"

# Instructions for connecting to GitHub
Write-Host "`nNext steps:" -ForegroundColor Green
Write-Host "1. Create a new repository on GitHub at: https://github.com/new" -ForegroundColor Yellow
Write-Host "2. Run the following commands to link your local repository to GitHub:" -ForegroundColor Yellow
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/piletrackerpro.git" -ForegroundColor Cyan
Write-Host "   git branch -M main" -ForegroundColor Cyan
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host "`nReplace YOUR_USERNAME with your actual GitHub username." -ForegroundColor Yellow
Write-Host "If you have two-factor authentication enabled, you'll need to use a personal access token instead of your password." -ForegroundColor Yellow

Write-Host "`nSetup complete!" -ForegroundColor Green 