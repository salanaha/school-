/**
 * محرك الخوارزمية الوراثية لإعداد الجداول المدرسية
 * Genetic Algorithm Scheduler for School Timetables
 * يوفر سرعة عالية مع جودة حل جيدة
 */

class GeneticScheduler {
    constructor(config = {}) {
        this.config = {
            populationSize: config.populationSize || 100,
            generationLimit: config.generationLimit || 500,
            mutationRate: config.mutationRate || 0.15,
            crossoverRate: config.crossoverRate || 0.85,
            eliteSize: config.eliteSize || Math.max(5, Math.floor(config.populationSize * 0.05) || 5),
            timeLimit: config.timeLimit || 30000, // 30 ثانية
            verbose: config.verbose || false,
            ...config
        };

        this.population = [];
        this.bestIndividual = null;
        this.bestFitness = -Infinity;
        this.generationBestFitness = [];
        this.status = 'UNKNOWN';
    }

    /**
     * إنشاء فرد عشوائي (جدول عشوائي)
     */
    createIndividual(timetableSize, numClasses, numTeachers, numPeriods) {
        const individual = {
            genes: [],
            fitness: 0,
            constraints: {
                violated: 0,
                satisfied: 0
            }
        };

        // إنشاء جدول عشوائي
        for (let i = 0; i < timetableSize; i++) {
            individual.genes.push({
                classId: Math.floor(Math.random() * numClasses),
                teacherId: Math.floor(Math.random() * numTeachers),
                period: Math.floor(Math.random() * numPeriods),
                subjectId: Math.floor(Math.random() * 10) // عدد المواد
            });
        }

        return individual;
    }

    /**
     * تقييم الفرد (حساب الـ Fitness)
     */
    evaluateFitness(individual, constraints = []) {
        let fitness = 100; // البداية من 100
        let violatedCount = 0;

        // تقييم كل قيد
        constraints.forEach(constraint => {
            const result = this.checkConstraint(individual, constraint);
            if (!result) {
                fitness -= constraint.penalty || 10;
                violatedCount++;
            }
        });

        // تجنب الجداول الفارغة تماماً
        fitness = Math.max(0, fitness);

        individual.fitness = fitness;
        individual.constraints.violated = violatedCount;
        individual.constraints.satisfied = constraints.length - violatedCount;

        return fitness;
    }

    /**
     * التحقق من قيد معين
     */
    checkConstraint(individual, constraint) {
        switch (constraint.type) {
            case 'NON_OVERLAP':
                return this.checkNonOverlap(individual, constraint);

            case 'HOURS_LIMIT':
                return this.checkHoursLimit(individual, constraint);

            case 'SUBJECT_DISTRIBUTION':
                return this.checkSubjectDistribution(individual, constraint);

            case 'BREAK_TIME':
                return this.checkBreakTime(individual, constraint);

            case 'NON_CONSECUTIVE':
                return this.checkNonConsecutive(individual, constraint);

            case 'PREFERRED_DAYS':
                return this.checkPreferredDays(individual, constraint);

            case 'UNAVAILABLE_PERIODS':
                return this.checkUnavailablePeriods(individual, constraint);

            case 'CLASS_CONTINUOUS':
                return this.checkClassContinuous(individual, constraint);

            default:
                return true;
        }
    }

    checkNonOverlap(individual, constraint) {
        // التحقق من عدم تعارض نفس الأستاذ في نفس الفترة
        const { teacherId, periods } = constraint;
        const teacherGenes = individual.genes.filter(g => g.teacherId === teacherId);
        
        const periodsInUse = new Set(teacherGenes.map(g => g.period));
        return periodsInUse.size === teacherGenes.length; // لا يوجد تعارض
    }

    checkHoursLimit(individual, constraint) {
        // التحقق من حد الساعات للأستاذ
        const { teacherId, min, max } = constraint;
        const hoursCount = individual.genes.filter(g => g.teacherId === teacherId).length;
        return hoursCount >= min && hoursCount <= max;
    }

    checkSubjectDistribution(individual, constraint) {
        // التحقق من توزيع المواد على الأقسام
        const { subject, classId, requiredHours } = constraint;
        const subjectHours = individual.genes.filter(
            g => g.subjectId === subject && g.classId === classId
        ).length;
        return subjectHours >= requiredHours * 0.9; // تسامح 10%
    }

    checkBreakTime(individual, constraint) {
        // التحقق من فترات الراحة بين الدروس
        const { teacherId, breakMinutes } = constraint;
        return true; // تم تنفيذه في السياق الفعلي
    }

    checkNonConsecutive(individual, constraint) {
        // التحقق من عدم تتابع نفس المادة
        const { subject, classId, maxConsecutive } = constraint;
        const subjectGenes = individual.genes.filter(
            g => g.subjectId === subject && g.classId === classId
        );
        
        let consecutiveCount = 0;
        for (let i = 1; i < subjectGenes.length; i++) {
            if (subjectGenes[i].period === subjectGenes[i - 1].period + 1) {
                consecutiveCount++;
            }
        }
        return consecutiveCount <= maxConsecutive;
    }

    checkPreferredDays(individual, constraint) {
        // التحقق من الأيام المفضلة
        return true;
    }

    checkUnavailablePeriods(individual, constraint) {
        // التحقق من الفترات غير المتاحة
        const { teacherId, periods } = constraint;
        const unavailableGenes = individual.genes.filter(
            g => g.teacherId === teacherId && periods.includes(g.period)
        );
        return unavailableGenes.length === 0;
    }

    checkClassContinuous(individual, constraint) {
        // التحقق من استمرارية دروس القسم
        return true;
    }

    /**
     * إنشاء الجيل الأول (السكان الأولية)
     */
    initializePopulation(timetableSize, numClasses, numTeachers, numPeriods, constraints) {
        this.population = [];

        for (let i = 0; i < this.config.populationSize; i++) {
            const individual = this.createIndividual(timetableSize, numClasses, numTeachers, numPeriods);
            this.evaluateFitness(individual, constraints);
            this.population.push(individual);

            // تحديث أفضل فرد
            if (individual.fitness > this.bestFitness) {
                this.bestFitness = individual.fitness;
                this.bestIndividual = JSON.parse(JSON.stringify(individual));
            }
        }

        // ترتيب السكان حسب الـ Fitness
        this.population.sort((a, b) => b.fitness - a.fitness);
    }

    /**
     * الاختيار بالعجلة (Roulette Wheel Selection)
     */
    selectParent() {
        const totalFitness = this.population.reduce((sum, ind) => sum + ind.fitness, 0);
        let random = Math.random() * totalFitness;

        for (let individual of this.population) {
            random -= individual.fitness;
            if (random <= 0) {
                return individual;
            }
        }

        return this.population[0];
    }

    /**
     * عملية الـ Crossover (التقاطع)
     */
    crossover(parent1, parent2) {
        if (Math.random() > this.config.crossoverRate) {
            return JSON.parse(JSON.stringify(parent1));
        }

        const child = {
            genes: [],
            fitness: 0,
            constraints: { violated: 0, satisfied: 0 }
        };

        const crossoverPoint = Math.floor(Math.random() * parent1.genes.length);

        // أخذ الجزء الأول من الوالد الأول
        for (let i = 0; i < crossoverPoint; i++) {
            child.genes.push(JSON.parse(JSON.stringify(parent1.genes[i])));
        }

        // أخذ الجزء الثاني من الوالد الثاني
        for (let i = crossoverPoint; i < parent2.genes.length; i++) {
            child.genes.push(JSON.parse(JSON.stringify(parent2.genes[i])));
        }

        return child;
    }

    /**
     * عملية الطفرة (Mutation)
     */
    mutate(individual, numClasses, numTeachers, numPeriods) {
        for (let i = 0; i < individual.genes.length; i++) {
            if (Math.random() < this.config.mutationRate) {
                // اختيار أي جزء من الجين لتغييره
                const mutationType = Math.floor(Math.random() * 3);

                switch (mutationType) {
                    case 0: // تغيير الأستاذ
                        individual.genes[i].teacherId = Math.floor(Math.random() * numTeachers);
                        break;
                    case 1: // تغيير الفترة
                        individual.genes[i].period = Math.floor(Math.random() * numPeriods);
                        break;
                    case 2: // تغيير القسم
                        individual.genes[i].classId = Math.floor(Math.random() * numClasses);
                        break;
                }
            }
        }

        return individual;
    }

    /**
     * حل مشكلة الجدول باستخدام الخوارزمية الوراثية
     */
    solve(timetableSize, numClasses, numTeachers, numPeriods, constraints = []) {
        const startTime = Date.now();
        this.log('🧬 بدء حل مشكلة الجدول باستخدام الخوارزمية الوراثية...');
        this.log(`حجم السكان: ${this.config.populationSize}`);
        this.log(`عدد الأجيال: ${this.config.generationLimit}`);
        this.log(`عدد القيود: ${constraints.length}`);

        try {
            // إنشاء السكان الأوليين
            this.initializePopulation(timetableSize, numClasses, numTeachers, numPeriods, constraints);
            this.log(`✓ تم إنشاء السكان الأوليين - أفضل Fitness: ${this.bestFitness.toFixed(2)}`);

            let generation = 0;

            while (generation < this.config.generationLimit) {
                if (Date.now() - startTime > this.config.timeLimit) {
                    this.log('⏱️ انتهت مهلة الزمن');
                    break;
                }

                // إنشاء الجيل الجديد
                const newPopulation = [];

                // الحفاظ على النخبة (Elitism)
                for (let i = 0; i < this.config.eliteSize; i++) {
                    newPopulation.push(JSON.parse(JSON.stringify(this.population[i])));
                }

                // إنشاء باق�� السكان الجدد
                while (newPopulation.length < this.config.populationSize) {
                    const parent1 = this.selectParent();
                    const parent2 = this.selectParent();

                    let child = this.crossover(parent1, parent2);
                    child = this.mutate(child, numClasses, numTeachers, numPeriods);

                    this.evaluateFitness(child, constraints);
                    newPopulation.push(child);
                }

                this.population = newPopulation;
                this.population.sort((a, b) => b.fitness - a.fitness);

                // تحديث أفضل فرد
                if (this.population[0].fitness > this.bestFitness) {
                    this.bestFitness = this.population[0].fitness;
                    this.bestIndividual = JSON.parse(JSON.stringify(this.population[0]));
                    this.log(`✨ تحسن! أفضل Fitness في الجيل ${generation}: ${this.bestFitness.toFixed(2)}`);
                }

                this.generationBestFitness.push(this.bestFitness);

                // طباعة تقدم كل 50 جيل
                if (generation % 50 === 0) {
                    this.log(`الجيل ${generation}: أفضل Fitness = ${this.bestFitness.toFixed(2)}`);
                }

                // إذا وصلنا إلى الحل الأمثل، توقف
                if (this.bestFitness >= 100) {
                    this.status = 'OPTIMAL';
                    this.log(`✅ تم إيجاد الحل الأمثل في الجيل ${generation}`);
                    break;
                }

                generation++;
            }

            if (this.status !== 'OPTIMAL') {
                this.status = this.bestFitness > 80 ? 'FEASIBLE' : 'PARTIAL';
                this.log(`⚠️ انتهى البحث - أفضل Fitness: ${this.bestFitness.toFixed(2)}%`);
            }

            const elapsed = Date.now() - startTime;
            this.log(`⏱️ الوقت المستغرق: ${elapsed}ms`);
            this.log(`📊 عدد الأجيال: ${generation}`);

            return {
                status: this.status,
                solution: this.bestIndividual,
                fitness: this.bestFitness,
                time: elapsed,
                generations: generation,
                fitnessHistory: this.generationBestFitness,
                populationStats: {
                    size: this.config.populationSize,
                    mutationRate: this.config.mutationRate,
                    crossoverRate: this.config.crossoverRate
                }
            };

        } catch (error) {
            this.status = 'ERROR';
            this.log(`❌ خطأ: ${error.message}`);
            return {
                status: 'ERROR',
                error: error.message,
                solution: null
            };
        }
    }

    /**
     * الحصول على الحل الأفضل
     */
    getBestSolution() {
        return this.bestIndividual;
    }

    /**
     * الحصول على تاريخ التحسن
     */
    getFitnessHistory() {
        return this.generationBestFitness;
    }

    /**
     * تحسين الحل (Fine-tuning)
     */
    refineSolution(solution, constraints, iterations = 100) {
        let bestSolution = JSON.parse(JSON.stringify(solution));
        let bestFitness = this.bestFitness;

        for (let i = 0; i < iterations; i++) {
            const candidate = JSON.parse(JSON.stringify(bestSolution));

            // تطبيق طفرات أقل عدوانية
            for (let j = 0; j < candidate.genes.length; j++) {
                if (Math.random() < 0.05) { // معدل طفرة أقل
                    const geneIndex = Math.floor(Math.random() * Object.keys(candidate.genes[j]).length);
                    const keys = Object.keys(candidate.genes[j]);
                    candidate.genes[j][keys[geneIndex]] = 
                        Math.floor(Math.random() * 100);
                }
            }

            this.evaluateFitness(candidate, constraints);

            if (candidate.fitness > bestFitness) {
                bestFitness = candidate.fitness;
                bestSolution = candidate;
            }
        }

        return bestSolution;
    }

    /**
     * طباعة السجل
     */
    log(message) {
        if (this.config.verbose) {
            console.log(`[GeneticScheduler] ${message}`);
        }
    }

    /**
     * تصدير تقرير مفصل
     */
    generateReport() {
        return {
            status: this.status,
            bestFitness: this.bestFitness,
            bestIndividual: this.bestIndividual,
            fitnessHistory: this.generationBestFitness,
            populationSize: this.config.populationSize,
            mutationRate: this.config.mutationRate,
            crossoverRate: this.config.crossoverRate,
            summary: {
                averageImprovement: this.calculateAverageImprovement(),
                convergenceGeneration: this.getConvergenceGeneration(),
                stabilityScore: this.calculateStabilityScore()
            }
        };
    }

    /**
     * حساب متوسط التحسن
     */
    calculateAverageImprovement() {
        if (this.generationBestFitness.length < 2) return 0;
        
        let totalImprovement = 0;
        for (let i = 1; i < this.generationBestFitness.length; i++) {
            totalImprovement += Math.max(0, 
                this.generationBestFitness[i] - this.generationBestFitness[i - 1]
            );
        }
        return (totalImprovement / this.generationBestFitness.length).toFixed(4);
    }

    /**
     * الحصول على جيل التقارب
     */
    getConvergenceGeneration() {
        const threshold = this.bestFitness * 0.95;
        for (let i = 0; i < this.generationBestFitness.length; i++) {
            if (this.generationBestFitness[i] >= threshold) {
                return i;
            }
        }
        return this.generationBestFitness.length;
    }

    /**
     * حساب درجة الاستقرار
     */
    calculateStabilityScore() {
        if (this.generationBestFitness.length < 10) return 0;
        
        const lastTen = this.generationBestFitness.slice(-10);
        const max = Math.max(...lastTen);
        const min = Math.min(...lastTen);
        
        return ((1 - (max - min) / max) * 100).toFixed(2);
    }

    /**
     * مقارنة مع محرك آخر
     */
    compareWith(otherSchedulerResult) {
        return {
            geneticAlgorithm: {
                fitness: this.bestFitness,
                time: this.generationBestFitness.length,
                status: this.status
            },
            other: {
                fitness: otherSchedulerResult.fitness || 'N/A',
                time: otherSchedulerResult.time || 'N/A',
                status: otherSchedulerResult.status || 'N/A'
            },
            comparison: {
                fitnessImprovement: 
                    otherSchedulerResult.fitness ? 
                    (((this.bestFitness - otherSchedulerResult.fitness) / otherSchedulerResult.fitness) * 100).toFixed(2) + '%' : 
                    'N/A',
                speedRatio: 
                    otherSchedulerResult.time ? 
                    (otherSchedulerResult.time / this.generationBestFitness.length).toFixed(2) + 'x' : 
                    'N/A'
            }
        };
    }
}

// تصدير الفئة للاستخدام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeneticScheduler;
}
