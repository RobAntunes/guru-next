/**
 * Diff Analyzer Service (Second Face)
 * Generates plain English summaries of code diffs
 */

import type { CodeDiff, DiffSummary } from '../../../../shared/types/task';
import { extractFileOperations } from '../../utils/code-extractor';

class DiffAnalyzerService {
  /**
   * Analyze diff and generate summary
   */
  analyzeDiff(diff: CodeDiff, response: string): DiffSummary {
    const fileOps = extractFileOperations(response);

    // Categorize changes
    const dependencies: string[] = [];
    const newCode: string[] = [];
    const modifiedBehavior: string[] = [];
    const deletions: string[] = [];
    const risks: string[] = [];

    for (const file of diff.files) {
      const filePath = file.path;

      // Check for package.json or dependency files
      if (filePath.includes('package.json') || filePath.includes('requirements.txt') ||
          filePath.includes('Gemfile') || filePath.includes('Cargo.toml')) {
        dependencies.push(`Modified dependencies in ${filePath}`);
      }

      // Check for new files
      if (fileOps.creates.includes(filePath)) {
        newCode.push(`Created ${filePath}`);
      }

      // Check for deletions
      if (fileOps.deletes.includes(filePath)) {
        deletions.push(`Deleted ${filePath}`);
      }

      // Check for modifications
      if (fileOps.modifies.includes(filePath) || (!fileOps.creates.includes(filePath) && !fileOps.deletes.includes(filePath))) {
        modifiedBehavior.push(`Modified ${filePath}`);
      }

      // Assess risks
      const fileRisks = this.assessFileRisks(file, response);
      risks.push(...fileRisks);
    }

    // Generate overview
    const overview = this.generateOverview(diff, dependencies, newCode, modifiedBehavior, deletions);

    // Calculate impact score
    const impactScore = this.calculateImpactScore(dependencies, newCode, modifiedBehavior, deletions, risks);

    return {
      overview,
      categories: {
        dependencies,
        newCode,
        modifiedBehavior,
        deletions,
        risks
      },
      impactScore
    };
  }

  /**
   * Generate overview text
   */
  private generateOverview(
    diff: CodeDiff,
    dependencies: string[],
    newCode: string[],
    modifiedBehavior: string[],
    deletions: string[]
  ): string {
    const parts: string[] = [];

    if (dependencies.length > 0) {
      parts.push(`Updates ${dependencies.length} dependency file(s)`);
    }

    if (newCode.length > 0) {
      parts.push(`creates ${newCode.length} new file(s)`);
    }

    if (modifiedBehavior.length > 0) {
      parts.push(`modifies ${modifiedBehavior.length} existing file(s)`);
    }

    if (deletions.length > 0) {
      parts.push(`deletes ${deletions.length} file(s)`);
    }

    if (parts.length === 0) {
      return 'No significant changes detected';
    }

    return 'This change ' + parts.join(', ') + '.';
  }

  /**
   * Assess risks for a file
   */
  private assessFileRisks(file: CodeDiff['files'][0], response: string): string[] {
    const risks: string[] = [];

    // Check for security-sensitive files
    if (file.path.includes('.env') || file.path.includes('secrets') ||
        file.path.includes('credentials')) {
      risks.push(`⚠️ Modifying security-sensitive file: ${file.path}`);
    }

    // Check for authentication/authorization changes
    if (response.toLowerCase().includes('auth') || response.toLowerCase().includes('security')) {
      risks.push(`⚠️ Changes may affect authentication/security`);
    }

    // Check for database migrations
    if (file.path.includes('migration') || file.path.includes('schema')) {
      risks.push(`⚠️ Database schema changes detected`);
    }

    // Check for API breaking changes
    if (response.includes('breaking') || response.includes('BREAKING')) {
      risks.push(`🔴 Potential breaking changes`);
    }

    return risks;
  }

  /**
   * Calculate impact score
   */
  private calculateImpactScore(
    dependencies: string[],
    newCode: string[],
    modifiedBehavior: string[],
    deletions: string[],
    risks: string[]
  ): 'low' | 'medium' | 'high' {
    let score = 0;

    // Weights
    score += dependencies.length * 3;
    score += newCode.length * 1;
    score += modifiedBehavior.length * 2;
    score += deletions.length * 3;
    score += risks.length * 5;

    if (score <= 5) return 'low';
    if (score <= 15) return 'medium';
    return 'high';
  }

  /**
   * Generate plain English explanation
   */
  generateExplanation(summary: DiffSummary): string {
    const parts: string[] = [summary.overview];

    if (summary.categories.newCode.length > 0) {
      parts.push('\n**New Files:**');
      summary.categories.newCode.forEach(item => parts.push(`- ${item}`));
    }

    if (summary.categories.modifiedBehavior.length > 0) {
      parts.push('\n**Modified Files:**');
      summary.categories.modifiedBehavior.forEach(item => parts.push(`- ${item}`));
    }

    if (summary.categories.dependencies.length > 0) {
      parts.push('\n**Dependencies:**');
      summary.categories.dependencies.forEach(item => parts.push(`- ${item}`));
    }

    if (summary.categories.deletions.length > 0) {
      parts.push('\n**Deleted:**');
      summary.categories.deletions.forEach(item => parts.push(`- ${item}`));
    }

    if (summary.categories.risks.length > 0) {
      parts.push('\n**Risks:**');
      summary.categories.risks.forEach(item => parts.push(`- ${item}`));
    }

    return parts.join('\n');
  }
}

export const diffAnalyzer = new DiffAnalyzerService();
