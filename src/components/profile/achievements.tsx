import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Title, type User } from "@prisma/client";
import {
  Bug,
  Calendar,
  Code,
  Cross,
  Crosshair,
  Flame,
  Heart,
  Hourglass,
  Shield,
  Skull,
  Star,
  Sword,
  Trophy,
  Utensils,
} from "lucide-react";
import { useTranslations } from "next-intl";

const titleIconMap: Record<Title, React.ReactNode> = {
  [Title.DEVELOPER]: (
    <Badge className="bg-gradient-to-r from-pink-600 to-purple-600 text-white">
      <Code className="h-4 w-4" />
    </Badge>
  ),
  [Title.EMPLOYEE]: (
    <Badge className="bg-green-500 text-white">
      <Shield className="h-4 w-4 fill-white" />
    </Badge>
  ),
  [Title.BETA_TESTER]: (
    <Badge className="bg-yellow-500 text-white">
      <Bug className="h-4 w-4" />
    </Badge>
  ),
  [Title.DAY_ONE_USER]: (
    <Badge className="bg-gray-500 text-white">
      <Calendar className="h-4 w-4" />
    </Badge>
  ),
  [Title.BASIC_PLAN_SUBSCRIBER]: (
    <Badge className="bg-pink-500 text-white">
      <Heart className="h-4 w-4 fill-white" />
    </Badge>
  ),
  [Title.PREMIUM_PLAN_SUBSCRIBER]: (
    <Badge className="bg-amber-500 text-white">
      <Heart className="h-4 w-4 fill-white" />
    </Badge>
  ),
  [Title.VIP]: (
    <Badge className="bg-purple-500 text-white">
      <Star className="h-4 w-4 fill-white" />
    </Badge>
  ),
  [Title.HIGHEST_RANK_ON_A_HERO]: (
    <Badge className="bg-amber-500 text-white">
      <Trophy className="h-4 w-4" />
    </Badge>
  ),
  [Title.HIGHEST_AJAX_COUNT]: (
    <Badge className="bg-amber-900 text-white">
      <Utensils className="h-4 w-4" />
    </Badge>
  ),
  [Title.HIGHEST_FLETA_DEADLIFT_PERCENTAGE]: (
    <Badge className="bg-red-500 text-white">
      <Sword className="h-4 w-4" />
    </Badge>
  ),
  [Title.TOP_3_KILLS]: (
    <Badge className="bg-blue-500 text-white">
      <Crosshair className="h-4 w-4" />
    </Badge>
  ),
  [Title.TOP_3_DAMAGE_DEALT]: (
    <Badge className="bg-orange-500 text-white">
      <Flame className="h-4 w-4 fill-white" />
    </Badge>
  ),
  [Title.TOP_3_HEALING]: (
    <Badge className="bg-green-500 text-white">
      <Cross className="h-4 w-4" />
    </Badge>
  ),
  [Title.TOP_3_DAMAGE_BLOCKED]: (
    <Badge className="bg-sky-500 text-white">
      <Shield className="h-4 w-4 fill-white" />
    </Badge>
  ),
  [Title.TOP_3_DEATHS]: (
    <Badge className="bg-indigo-500 text-white">
      <Skull className="h-4 w-4" />
    </Badge>
  ),
  [Title.TOP_3_TIME_PLAYED]: (
    <Badge className="bg-purple-500 text-white">
      <Hourglass className="h-4 w-4" />
    </Badge>
  ),
};

export function Achievements({ user }: { user: User }) {
  const t = useTranslations("titles");
  const titles = user.titles;

  return (
    <section>
      <h2 className="mb-2 text-xl font-bold">Titles</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        See a list of earned titles and their descriptions.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {titles.map((title) => (
          <Card key={title}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold tracking-tight">
                  {t(title)}
                </CardTitle>
                {titleIconMap[title]}
              </div>
            </CardHeader>
            <CardContent>
              <p>{t(`${title}-description`)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
