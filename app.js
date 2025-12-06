class InvestmentAnalyzer {
    constructor() {
        this.dataLoader = new DataLoader();
        this.model = new GRUModel();
        this.normalizedData = null;
        this.rankingData = null;
        this.predictions = [];
        this.userPreferences = {
            sector: 'all',
            investmentAmount: 100000,
            riskTolerance: 'medium',
            minROIC: 10
        };
        
        this.initializeApp();
    }

    log(message, type = 'info') {
        const logElement = document.getElementById('consoleLog');
        if (logElement) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry log-${type}`;
            logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
            logElement.appendChild(logEntry);
            logElement.scrollTop = logElement.scrollHeight;
        }
        console.log(message);
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.innerHTML = message;
        }
    }

    initializeApp() {
        this.log('🚀 RiskScope Analytics Initialized', 'info');
        this.log('💡 Configure your investment parameters and click "Start Analysis"', 'info');
        this.updateStatus('Ready to start. Select your investment parameters and click "Start Analysis".');
        
        this.setupEventListeners();
        this.loadRankingData();
    }

    setupEventListeners() {
        // Risk tolerance selection
        document.querySelectorAll('.risk-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.risk-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                e.currentTarget.classList.add('selected');
                this.userPreferences.riskTolerance = e.currentTarget.dataset.risk;
                this.log(`Risk tolerance set to: ${this.userPreferences.riskTolerance}`, 'info');
            });
        });

        // Sector selection
        document.getElementById('sectorSelect').addEventListener('change', (e) => {
            this.userPreferences.sector = e.target.value;
            this.log(`Sector selected: ${this.userPreferences.sector}`, 'info');
        });

        // Investment amount
        document.getElementById('investmentAmount').addEventListener('input', (e) => {
            this.userPreferences.investmentAmount = parseInt(e.target.value);
            this.log(`Investment amount set to: $${this.userPreferences.investmentAmount.toLocaleString()}`, 'info');
        });

        // Minimum ROIC
        document.getElementById('minROIC').addEventListener('input', (e) => {
            this.userPreferences.minROIC = parseInt(e.target.value);
            this.log(`Minimum ROIC set to: ${this.userPreferences.minROIC}%`, 'info');
        });

        // Buttons
        document.getElementById('startBtn').addEventListener('click', () => this.startAnalysis());
        document.getElementById('trainModelBtn').addEventListener('click', () => this.trainModel());
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeInvestments());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetApp());
    }

    setButtonState(buttonId, enabled) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = !enabled;
            const loading = button.querySelector('.loading');
            if (loading) {
                loading.style.display = enabled ? 'none' : 'inline-block';
            }
        }
    }

    async loadRankingData() {
        try {
            this.log('📥 Loading ranking data...', 'info');
            const response = await fetch('data/ranking_2025.csv');
            const csvText = await response.text();
            
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                complete: (results) => {
                    this.rankingData = results.data;
                    this.log(`✅ Successfully loaded ${this.rankingData.length} companies from ranking data`, 'success');
                },
                error: (error) => {
                    this.log(`❌ Failed to load ranking data: ${error}`, 'error');
                }
            });
        } catch (error) {
            this.log(`❌ Error loading ranking data: ${error.message}`, 'error');
        }
    }

    async startAnalysis() {
        this.log('🎯 === STARTING INVESTMENT ANALYSIS ===', 'info');
        this.updateStatus('<span class="loading"></span>Starting analysis process...');
        
        // Disable start button
        this.setButtonState('startBtn', false);
        
        try {
            // Step 1: Load training data
            this.log('📊 Loading training data...', 'info');
            this.updateStatus('<span class="loading"></span>Loading training data...');
            
            const dataLoaded = await this.dataLoader.loadData();
            if (!dataLoaded) {
                throw new Error('Failed to load training data');
            }
            
            this.dataLoader.preprocessData();
            this.normalizedData = this.dataLoader.normalizeData();
            
            const summary = this.dataLoader.getDataSummary();
            this.log(`📈 Dataset loaded: ${summary.trainSamples} training samples, ${summary.testSamples} test samples`, 'success');
            
            // Enable train model button
            this.setButtonState('trainModelBtn', true);
            this.updateStatus('✅ Data loaded successfully. Click "Train Model" to continue.');
            
        } catch (error) {
            this.log(`❌ Analysis failed: ${error.message}`, 'error');
            this.updateStatus(`❌ Analysis failed: ${error.message}`);
            this.setButtonState('startBtn', true);
        }
    }

    async trainModel() {
        if (!this.normalizedData) {
            this.log('❌ No data available for training', 'error');
            return;
        }

        this.updateStatus('<span class="loading"></span>Training GRU model...');
        this.setButtonState('trainModelBtn', false);
        this.log('🧠 Training GRU model with 3 epochs...', 'info');
        
        try {
            await this.model.trainModel(
                this.normalizedData.train, 
                this.normalizedData.test,
                3,
                4
            );
            
            // Evaluate model
            const metrics = await this.model.evaluateModel(this.normalizedData.test);
            
            // Update UI with metrics
            document.getElementById('gruAccuracy').textContent = metrics.accuracy.toFixed(4);
            document.getElementById('gruLoss').textContent = metrics.loss.toFixed(4);
            
            // Enable analyze button
            this.setButtonState('analyzeBtn', true);
            
            this.updateStatus('✅ Model trained successfully. Click "Analyze Investments" to see recommendations.');
            this.log('🎉 Model training completed! Ready for investment analysis.', 'success');
            
        } catch (error) {
            this.log(`❌ Error training model: ${error.message}`, 'error');
            this.updateStatus('❌ Model training failed');
            this.setButtonState('trainModelBtn', true);
        }
    }

    async analyzeInvestments() {
        if (!this.rankingData || !this.model.model) {
            this.log('❌ Required data or model not available', 'error');
            return;
        }

        this.updateStatus('<span class="loading"></span>Analyzing investment opportunities...');
        this.setButtonState('analyzeBtn', false);
        this.log('🔍 Analyzing companies based on investment criteria...', 'info');
        
        try {
            // Filter and rank companies
            const filteredCompanies = this.filterCompaniesByCriteria();
            const rankedCompanies = this.rankCompanies(filteredCompanies);
            
            // Display results
            this.displayResults(rankedCompanies);
            
            // Show results view
            document.getElementById('initialView').style.display = 'none';
            document.getElementById('resultsView').classList.add('active');
            
            this.updateStatus('✅ Investment analysis completed successfully!');
            this.log(`📊 Found ${rankedCompanies.length} suitable companies for investment`, 'success');
            
        } catch (error) {
            this.log(`❌ Error analyzing investments: ${error.message}`, 'error');
            this.updateStatus('❌ Investment analysis failed');
            this.setButtonState('analyzeBtn', true);
        }
    }

    filterCompaniesByCriteria() {
        const { sector, minROIC, riskTolerance } = this.userPreferences;
        
        return this.rankingData.filter(company => {
            // Filter by sector
            if (sector !== 'all' && company.Sector !== sector) {
                return false;
            }
            
            // Filter by ROIC
            const roic = parseFloat(company.ROIC) * 100; // Convert to percentage
            if (isNaN(roic) || roic < minROIC) {
                return false;
            }
            
            // Filter by risk tolerance based on beta
            const beta = parseFloat(company['Beta (5Y)']) || 1;
            
            switch (riskTolerance) {
                case 'low':
                    if (beta > 0.8) return false;
                    break;
                case 'high':
                    if (beta < 1.2) return false;
                    break;
                // medium accepts all
            }
            
            return true;
        });
    }

    rankCompanies(companies) {
        // Enhanced ranking based on multiple factors
        return companies.map(company => {
            const roic = parseFloat(company.ROIC) * 100 || 0;
            const revenue = parseFloat(company.Revenue) || 0;
            const marketCap = parseFloat(company['Market Cap']) || 0;
            const profitMargin = parseFloat(company['Profit Margin']) || 0;
            const debtEquity = parseFloat(company['Debt / Equity']) || 0;
            const beta = parseFloat(company['Beta (5Y)']) || 1;
            
            // Calculate composite score (weighted)
            let score = 0;
            
            // ROIC is most important (40%)
            score += (roic / 100) * 40;
            
            // Profitability (20%)
            score += (Math.max(profitMargin, 0) / 0.3) * 20;
            
            // Size and stability (20%)
            score += (Math.log10(marketCap + 1) / 10) * 20;
            
            // Risk adjustment (20%) - lower risk gets higher score
            score += ((1 / Math.max(beta, 0.5)) * 20);
            
            // Penalize high debt
            if (debtEquity > 2) {
                score *= 0.8;
            }
            
            // Calculate investment amount based on ROIC and market cap
            const investmentScore = (roic * (marketCap > 0 ? 1 : 0.5)) / 100;
            const recommendedInvestment = Math.min(
                this.userPreferences.investmentAmount * (investmentScore / 100),
                marketCap * 0.01 // Don't recommend more than 1% of market cap
            );
            
            // Determine risk level based on beta and other factors
            let riskLevel = 'medium';
            let riskPercentage = 50;
            
            if (beta < 0.8) {
                riskLevel = 'low';
                riskPercentage = 30 + (beta * 25);
            } else if (beta > 1.2) {
                riskLevel = 'high';
                riskPercentage = 60 + ((beta - 1.2) * 20);
            } else {
                riskPercentage = 40 + ((beta - 0.8) * 50);
            }
            
            // Clamp risk percentage
            riskPercentage = Math.min(Math.max(riskPercentage, 10), 90);
            
            return {
                ...company,
                score: score,
                roic: roic,
                revenue: revenue,
                marketCap: marketCap,
                beta: beta,
                riskLevel: riskLevel,
                riskPercentage: riskPercentage,
                recommendedInvestment: recommendedInvestment,
                sharesToBuy: recommendedInvestment / (company.Current || company['IPO Price'] || 10)
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 20); // Show top 20
    }

    displayResults(companies) {
        // Update portfolio summary
        document.getElementById('totalCompanies').textContent = companies.length;
        
        const avgROIC = companies.reduce((sum, c) => sum + c.roic, 0) / companies.length || 0;
        document.getElementById('avgROIC').textContent = avgROIC.toFixed(1) + '%';
        
        const avgRisk = companies.reduce((sum, c) => sum + c.riskPercentage, 0) / companies.length || 0;
        document.getElementById('avgRisk').textContent = avgRisk.toFixed(1) + '%';
        
        const totalInvestment = companies.reduce((sum, c) => sum + c.recommendedInvestment, 0);
        document.getElementById('portfolioValue').textContent = '$' + totalInvestment.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        
        // Populate company table
        const tableBody = document.getElementById('companyTableBody');
        tableBody.innerHTML = '';
        
        companies.forEach((company, index) => {
            const row = document.createElement('tr');
            
            // Format numbers
            const revenueFormatted = company.revenue >= 1000000 
                ? '$' + (company.revenue / 1000000).toFixed(1) + 'M'
                : '$' + (company.revenue / 1000).toFixed(0) + 'K';
            
            const marketCapFormatted = company.marketCap >= 1000000
                ? '$' + (company.marketCap / 1000000).toFixed(1) + 'M'
                : '$' + (company.marketCap / 1000).toFixed(0) + 'K';
            
            const investmentFormatted = '$' + company.recommendedInvestment.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
            
            // Risk badge
            const riskBadge = `<span class="risk-badge ${company.riskLevel}">${company.riskPercentage.toFixed(1)}%</span>`;
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${company['Company Name'] || 'N/A'}</strong></td>
                <td>${company.Sector || 'N/A'}</td>
                <td><strong>${company.roic.toFixed(1)}%</strong></td>
                <td>${riskBadge}</td>
                <td>${revenueFormatted}</td>
                <td>${marketCapFormatted}</td>
                <td><strong>${investmentFormatted}</strong></td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Create charts
        this.createCharts(companies);
    }

    createCharts(companies) {
        // ROIC vs Risk Chart
        const roicRiskCtx = document.getElementById('roicRiskChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.roicRiskChart) {
            this.roicRiskChart.destroy();
        }
        
        this.roicRiskChart = new Chart(roicRiskCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Companies',
                    data: companies.map(c => ({
                        x: c.roic,
                        y: c.riskPercentage,
                        r: Math.sqrt(c.revenue) / 10000
                    })),
                    backgroundColor: companies.map(c => {
                        switch(c.riskLevel) {
                            case 'low': return '#10B981';
                            case 'medium': return '#F59E0B';
                            case 'high': return '#EF4444';
                            default: return '#667eea';
                        }
                    })
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'ROIC vs Risk Analysis'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const company = companies[context.dataIndex];
                                return [
                                    `${company['Company Name']}`,
                                    `ROIC: ${company.roic.toFixed(1)}%`,
                                    `Risk: ${company.riskPercentage.toFixed(1)}%`,
                                    `Revenue: $${(company.revenue / 1000000).toFixed(1)}M`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'ROIC (%)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Risk Probability (%)'
                        }
                    }
                }
            }
        });
        
        // Revenue Distribution Chart
        const revenueCtx = document.getElementById('revenueDistributionChart').getContext('2d');
        
        if (this.revenueChart) {
            this.revenueChart.destroy();
        }
        
        // Group by sector
        const sectorRevenue = {};
        companies.forEach(c => {
            const sector = c.Sector || 'Other';
            if (!sectorRevenue[sector]) {
                sectorRevenue[sector] = 0;
            }
            sectorRevenue[sector] += c.revenue;
        });
        
        this.revenueChart = new Chart(revenueCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(sectorRevenue),
                datasets: [{
                    label: 'Total Revenue ($)',
                    data: Object.values(sectorRevenue),
                    backgroundColor: [
                        '#667eea', '#764ba2', '#10B981', '#F59E0B', 
                        '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Revenue Distribution by Sector'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + (value / 1000000).toFixed(0) + 'M';
                            }
                        }
                    }
                }
            }
        });
    }

    resetApp() {
        this.log('🔄 Resetting application...', 'info');
        
        if (this.model) {
            this.model.dispose();
        }
        
        // Reset data
        this.dataLoader = new DataLoader();
        this.model = new GRUModel();
        this.normalizedData = null;
        this.predictions = [];
        
        // Reset UI
        document.getElementById('consoleLog').innerHTML = '';
        document.getElementById('status').textContent = 'Ready to start. Select your investment parameters and click "Start Analysis".';
        
        // Reset metrics
        document.getElementById('gruAccuracy').textContent = '-';
        document.getElementById('gruLoss').textContent = '-';
        
        // Hide results view
        document.getElementById('initialView').style.display = 'block';
        document.getElementById('resultsView').classList.remove('active');
        
        // Reset buttons
        this.setButtonState('startBtn', true);
        this.setButtonState('trainModelBtn', false);
        this.setButtonState('analyzeBtn', false);
        
        // Reset user preferences
        this.userPreferences = {
            sector: 'all',
            investmentAmount: 100000,
            riskTolerance: 'medium',
            minROIC: 10
        };
        
        // Reset form
        document.getElementById('sectorSelect').value = 'all';
        document.getElementById('investmentAmount').value = 100000;
        document.getElementById('minROIC').value = 10;
        document.querySelectorAll('.risk-option').forEach((opt, index) => {
            opt.classList.remove('selected');
            if (index === 1) opt.classList.add('selected'); // Select moderate by default
        });
        
        this.log('✅ Application reset complete. Ready to start again.', 'success');
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new InvestmentAnalyzer();
});
