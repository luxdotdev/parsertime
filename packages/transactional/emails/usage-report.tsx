import { Column, Hr, Row, Section, Text } from "react-email";
import { EmailShell, EmailTitle } from "./_components";

type SignupMethod = {
  method: string;
  count: number;
  percentage: number;
};

type BillingPlanStat = {
  plan: string;
  count: number;
  percentage: number;
};

type TopUser = {
  name: string;
  scrimCount: number;
};

type TopTeam = {
  name: string;
  scrimCount: number;
};

type UsageReportEmailProps = {
  weekStart: string;
  weekEnd: string;
  newUsersThisWeek: number;
  newUsersLastWeek: number;
  newScrimsThisWeek: number;
  newScrimsLastWeek: number;
  newTeamsThisWeek: number;
  newTeamsLastWeek: number;
  totalUsers: number;
  totalScrims: number;
  totalTeams: number;
  paidUsers: number;
  conversionRate: number;
  signupMethods: SignupMethod[];
  billingPlans: BillingPlanStat[];
  topUsers: TopUser[];
  topTeams: TopTeam[];
};

type DeltaSentiment = "positive" | "negative" | "neutral";

const deltaTextClass: Record<DeltaSentiment, string> = {
  positive: "text-green-600",
  negative: "text-red-600",
  neutral: "text-gray-500",
};

function getDeltaSentiment(current: number, previous: number): DeltaSentiment {
  if (current > previous) return "positive";
  if (current < previous) return "negative";
  return "neutral";
}

function formatDelta(current: number, previous: number): string {
  const delta = current - previous;
  if (delta > 0) return `+${delta} vs last week`;
  if (delta < 0) return `${delta} vs last week`;
  return "No change vs last week";
}

function StatCard({
  label,
  value,
  deltaLabel,
  sentiment,
}: {
  label: string;
  value: string;
  deltaLabel?: string;
  sentiment?: DeltaSentiment;
}) {
  return (
    <div className="rounded-[6px] border border-solid border-[#eaeaea] bg-[#fafafa] p-[16px]">
      <Text className="m-0 mb-[4px] text-[12px] leading-[18px] text-[#666666]">
        {label}
      </Text>
      <Text className="m-0 mb-[4px] text-[24px] leading-[32px] font-bold text-black">
        {value}
      </Text>
      {deltaLabel && sentiment && (
        <Text
          className={`m-0 text-[12px] leading-[18px] ${deltaTextClass[sentiment]}`}
        >
          {deltaLabel}
        </Text>
      )}
    </div>
  );
}

function ReportSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text className="m-0 mb-[12px] text-[16px] leading-[24px] font-bold text-black">
      {children}
    </Text>
  );
}

function ReportDivider() {
  return (
    <Hr className="mx-0 my-[20px] w-full border border-solid border-[#eaeaea]" />
  );
}

export function UsageReportEmail({
  weekStart,
  weekEnd,
  newUsersThisWeek,
  newUsersLastWeek,
  newScrimsThisWeek,
  newScrimsLastWeek,
  newTeamsThisWeek,
  newTeamsLastWeek,
  totalUsers,
  totalScrims,
  totalTeams,
  paidUsers,
  conversionRate,
  signupMethods,
  billingPlans,
  topUsers,
  topTeams,
}: UsageReportEmailProps) {
  const userDelta = newUsersThisWeek - newUsersLastWeek;
  const previewText = `${newUsersThisWeek} new user${newUsersThisWeek !== 1 ? "s" : ""} this week${userDelta !== 0 ? `, ${userDelta > 0 ? "+" : ""}${userDelta} vs last week` : ""}. ${newScrimsThisWeek} scrim${newScrimsThisWeek !== 1 ? "s" : ""} created.`;

  return (
    <EmailShell preview={previewText}>
      <EmailTitle>Weekly usage report</EmailTitle>
      <Text className="mt-[-16px] mb-[24px] text-[14px] leading-[22px] text-[#666666]">
        {weekStart} &ndash; {weekEnd}
      </Text>

      <ReportSectionHeading>This week at a glance</ReportSectionHeading>

      <Row className="mb-[10px]">
        <Column className="w-[50%] pr-[5px]">
          <StatCard
            label="New users"
            value={newUsersThisWeek.toLocaleString()}
            sentiment={getDeltaSentiment(newUsersThisWeek, newUsersLastWeek)}
            deltaLabel={formatDelta(newUsersThisWeek, newUsersLastWeek)}
          />
        </Column>
        <Column className="w-[50%] pl-[5px]">
          <StatCard
            label="New scrims"
            value={newScrimsThisWeek.toLocaleString()}
            sentiment={getDeltaSentiment(newScrimsThisWeek, newScrimsLastWeek)}
            deltaLabel={formatDelta(newScrimsThisWeek, newScrimsLastWeek)}
          />
        </Column>
      </Row>

      <Row className="mb-[10px]">
        <Column className="w-[50%] pr-[5px]">
          <StatCard
            label="New teams"
            value={newTeamsThisWeek.toLocaleString()}
            sentiment={getDeltaSentiment(newTeamsThisWeek, newTeamsLastWeek)}
            deltaLabel={formatDelta(newTeamsThisWeek, newTeamsLastWeek)}
          />
        </Column>
        <Column className="w-[50%] pl-[5px]">
          <StatCard
            label="Paid conversion"
            value={`${conversionRate.toFixed(1)}%`}
            sentiment="neutral"
            deltaLabel={`${paidUsers.toLocaleString()} paid user${paidUsers !== 1 ? "s" : ""}`}
          />
        </Column>
      </Row>

      <Row className="mb-[10px]">
        <Column className="w-[50%] pr-[5px]">
          <StatCard label="Total users" value={totalUsers.toLocaleString()} />
        </Column>
        <Column className="w-[50%] pl-[5px]">
          <StatCard label="Total scrims" value={totalScrims.toLocaleString()} />
        </Column>
      </Row>

      <Row className="mb-[20px]">
        <Column className="w-[50%] pr-[5px]">
          <StatCard label="Total teams" value={totalTeams.toLocaleString()} />
        </Column>
        <Column className="w-[50%] pl-[5px]" />
      </Row>

      <ReportDivider />

      <ReportSectionHeading>Signup methods</ReportSectionHeading>

      {signupMethods.map((item) => (
        <Row key={item.method} className="mb-[8px]">
          <Column>
            <Text className="m-0 text-[14px] leading-[22px] text-[#171717]">
              {item.method}
            </Text>
          </Column>
          <Column className="text-right">
            <Text className="m-0 text-[14px] leading-[22px] font-semibold text-black">
              {item.count.toLocaleString()}{" "}
              <span className="font-normal text-[#999999]">
                ({item.percentage}%)
              </span>
            </Text>
          </Column>
        </Row>
      ))}

      <ReportDivider />

      <ReportSectionHeading>Billing plans</ReportSectionHeading>

      {billingPlans.map((item) => (
        <Row key={item.plan} className="mb-[8px]">
          <Column>
            <Text className="m-0 text-[14px] leading-[22px] text-[#171717]">
              {item.plan.charAt(0) + item.plan.slice(1).toLowerCase()}
            </Text>
          </Column>
          <Column className="text-right">
            <Text className="m-0 text-[14px] leading-[22px] font-semibold text-black">
              {item.count.toLocaleString()}{" "}
              <span className="font-normal text-[#999999]">
                ({item.percentage}%)
              </span>
            </Text>
          </Column>
        </Row>
      ))}

      {topUsers.length > 0 && (
        <>
          <ReportDivider />

          <ReportSectionHeading>Most active users</ReportSectionHeading>

          {topUsers.map((user, index) => (
            <Row key={user.name} className="mb-[8px]">
              <Column className="w-[24px]">
                <Text className="m-0 text-[14px] leading-[22px] font-semibold text-[#999999]">
                  {index + 1}
                </Text>
              </Column>
              <Column>
                <Text className="m-0 text-[14px] leading-[22px] text-[#171717]">
                  {user.name}
                </Text>
              </Column>
              <Column className="text-right">
                <Text className="m-0 text-[14px] leading-[22px] font-semibold text-black">
                  {user.scrimCount}{" "}
                  <span className="font-normal text-[#999999]">
                    scrim{user.scrimCount !== 1 ? "s" : ""}
                  </span>
                </Text>
              </Column>
            </Row>
          ))}
        </>
      )}

      {topTeams.length > 0 && (
        <>
          <ReportDivider />

          <ReportSectionHeading>Most active teams</ReportSectionHeading>

          {topTeams.map((team, index) => (
            <Row key={team.name} className="mb-[8px]">
              <Column className="w-[24px]">
                <Text className="m-0 text-[14px] leading-[22px] font-semibold text-[#999999]">
                  {index + 1}
                </Text>
              </Column>
              <Column>
                <Text className="m-0 text-[14px] leading-[22px] text-[#171717]">
                  {team.name}
                </Text>
              </Column>
              <Column className="text-right">
                <Text className="m-0 text-[14px] leading-[22px] font-semibold text-black">
                  {team.scrimCount}{" "}
                  <span className="font-normal text-[#999999]">
                    scrim{team.scrimCount !== 1 ? "s" : ""}
                  </span>
                </Text>
              </Column>
            </Row>
          ))}
        </>
      )}

      <Section className="mt-[24px]">
        <Text className="m-0 text-[13px] leading-[22px] text-[#666666]">
          This automated report goes to Sightline admins every week.
        </Text>
      </Section>
    </EmailShell>
  );
}

UsageReportEmail.PreviewProps = {
  weekStart: "Feb 13, 2026",
  weekEnd: "Feb 20, 2026",
  newUsersThisWeek: 12,
  newUsersLastWeek: 10,
  newScrimsThisWeek: 34,
  newScrimsLastWeek: 38,
  newTeamsThisWeek: 5,
  newTeamsLastWeek: 5,
  totalUsers: 842,
  totalScrims: 3201,
  totalTeams: 176,
  paidUsers: 94,
  conversionRate: 11.2,
  signupMethods: [
    { method: "Discord", count: 410, percentage: 49 },
    { method: "Email", count: 220, percentage: 26 },
    { method: "Google", count: 150, percentage: 18 },
    { method: "GitHub", count: 62, percentage: 7 },
  ],
  billingPlans: [
    { plan: "FREE", count: 748, percentage: 89 },
    { plan: "BASIC", count: 72, percentage: 9 },
    { plan: "PREMIUM", count: 22, percentage: 2 },
  ],
  topUsers: [
    { name: "Alice Kim", scrimCount: 14 },
    { name: "Bob Chen", scrimCount: 11 },
    { name: "Carol Wright", scrimCount: 9 },
    { name: "David Park", scrimCount: 7 },
    { name: "Eve Torres", scrimCount: 5 },
  ],
  topTeams: [
    { name: "Neon Wolves", scrimCount: 22 },
    { name: "Iron Lotus", scrimCount: 17 },
    { name: "Storm Rising", scrimCount: 13 },
    { name: "Cold Front", scrimCount: 9 },
    { name: "Echo Squad", scrimCount: 6 },
  ],
} satisfies UsageReportEmailProps;

export default UsageReportEmail;
