import type { FollowUpContext } from "./types";

export interface FollowUpTemplate {
  subject: (context: FollowUpContext) => string;
  body: (context: FollowUpContext) => string;
}

export const FOLLOW_UP_1_TEMPLATE: FollowUpTemplate = {
  subject: (context: FollowUpContext) => {
    const { domain } = context.website;
    return `Quick follow-up on ${domain}`;
  },

  body: (context: FollowUpContext) => {
    const { analysis, recipientName } = context;

    const lines: string[] = [];

    lines.push(recipientName ? `Hi ${recipientName},` : "Hi there,");
    lines.push("");
    lines.push("I wanted to quickly follow up on my previous email about your website.");
    lines.push("");

    if (analysis?.executiveSummary) {
      lines.push(
        "In case you missed it, I had shared some insights about improving your site's performance and online presence.",
      );
      lines.push("");
      lines.push(analysis.executiveSummary);
    } else {
      lines.push(
        "I had shared some insights about improving your site's performance and online presence.",
      );
    }

    lines.push("");
    lines.push(
      "These are relatively straightforward improvements that could make a real difference for your visitors and search visibility.",
    );
    lines.push("");
    lines.push("Happy to discuss this further whenever you have a moment.");
    lines.push("");
    lines.push("Best regards,");
    lines.push("[Digital Growth Consultant]");
    lines.push("(https://mainlinemlr.com)");
lines.push("");

    return lines.join("\n");
  },
};

export const FOLLOW_UP_2_TEMPLATE: FollowUpTemplate = {
  subject: (context: FollowUpContext) => {
    const { domain } = context.website;
    return `Still thinking about ${domain}?`;
  },

  body: (context: FollowUpContext) => {
    const { analysis, recipientName } = context;

    const lines: string[] = [];

    lines.push(recipientName ? `Hi ${recipientName},` : "Hi there,");
    lines.push("");
    lines.push("I'm checking in again regarding my previous emails about your website.");
    lines.push("");

    if (analysis?.overallScore) {
      lines.push(
        `Your current overall performance score is ${analysis.overallScore}/100, and there are some clear opportunities to improve this.`,
      );
    } else {
      lines.push(
        "There are some clear opportunities to improve how your website performs for visitors and search engines.",
      );
    }

    lines.push("");
    lines.push(
      "I know you're likely busy, but I wanted to make sure this didn't get buried in your inbox. These improvements are time-sensitive and could benefit your business right now.",
    );
    lines.push("");
    lines.push(
      "Would you be open to a brief 15-minute call to discuss the top 3 priorities?",
    );
    lines.push("");
    lines.push("Best regards,");
    lines.push("[Digital Growth Consultant]");
    lines.push("(https://mainlinemlr.com)");
lines.push("");

    return lines.join("\n");
  },
};

export const FOLLOW_UP_3_TEMPLATE: FollowUpTemplate = {
  subject: (context: FollowUpContext) => {
    const { domain } = context.website;
    return `Final follow-up: ${domain}`;
  },

  body: (context: FollowUpContext) => {
    const { analysis, recipientName } = context;

    const lines: string[] = [];

    lines.push(recipientName ? `Hi ${recipientName},` : "Hi there,");
    lines.push("");
    lines.push("This will be my last follow-up regarding your website.");
    lines.push("");
    lines.push(
      "I've reached out a few times over the past couple of weeks with suggestions for improving your site's performance and online presence.",
    );

    if (analysis?.weakestCategory) {
      lines.push("");
      lines.push(
        `The most impactful area to address is ${analysis.weakestCategory}, which could significantly improve your results.`,
      );
    }

    lines.push("");
    lines.push(
      "I understand if the timing isn't right or if this isn't a priority for you right now. I'll leave it here unless you decide to circle back.",
    );
    lines.push("");
    lines.push(
      "If you do want to pursue this in the future, feel free to reply to this email — I'll be happy to help.",
    );
    lines.push("");
    lines.push("Best regards,");
    lines.push("[Digital Growth Consultant]");
    lines.push("(https://mainlinemlr.com)");
lines.push("");

    return lines.join("\n");
  },
};

export function getFollowUpTemplate(
  sequence: number,
): FollowUpTemplate | null {
  switch (sequence) {
    case 1:
      return FOLLOW_UP_1_TEMPLATE;
    case 2:
      return FOLLOW_UP_2_TEMPLATE;
    case 3:
      return FOLLOW_UP_3_TEMPLATE;
    default:
      return null;
  }
}
