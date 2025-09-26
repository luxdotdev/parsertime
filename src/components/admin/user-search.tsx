"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { User } from "@prisma/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CheckCircle, Filter, Loader2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

type UserResponse = {
  items: User[];
  nextCursor: string | null;
  hasMore: boolean;
};

type UserSearchProps = {
  limit?: number;
  height?: string;
};

export function UserSearch({
  limit = 10,
  height = "max-h-[500px]",
}: UserSearchProps) {
  const t = useTranslations("settingsPage.admin.user-search");
  const loadMoreRef = useRef<HTMLTableRowElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [trustRange, setTrustRange] = useState([0, 100]);
  const [billingPlanFilter, setBillingPlanFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedSearch] = useDebounce(searchQuery, 300);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "users",
      debouncedSearch,
      trustRange,
      billingPlanFilter,
      limit,
    ] as const,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      params.set("limit", limit.toString());

      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("trustScoreMin", trustRange[0].toString());
      params.set("trustScoreMax", trustRange[1].toString());
      if (billingPlanFilter !== "all")
        params.set("billingPlan", billingPlanFilter);

      const res = await fetch(`/api/admin/user-search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");

      return res.json() as Promise<UserResponse>;
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : null,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.length === 0) return;
        const first = entries[0];
        if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const users = data ? data.pages.flatMap((page) => page.items) : [];

  function getBillingPlanBadge(score: string) {
    if (score === "FREE")
      return (
        <Badge className="bg-blue-400 text-white dark:bg-blue-600">FREE</Badge>
      );
    if (score === "BASIC")
      return (
        <Badge className="bg-purple-400 text-white dark:bg-purple-600">
          BASIC
        </Badge>
      );
    if (score === "PREMIUM")
      return (
        <Badge className="bg-gradient-to-r from-pink-600 to-purple-600 text-white">
          PREMIUM
        </Badge>
      );
    return <Badge className="bg-red-500">UNKNOWN</Badge>;
  }

  function clearFilters() {
    setSearchQuery("");
    setTrustRange([0, 100]);
    setBillingPlanFilter("all");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            type="search"
            placeholder={t("search-placeholder")}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {t("filters.title")}
        </Button>
      </div>

      {showFilters && (
        <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="trust-score">{t("filters.trust-score")}</Label>
            <div className="pt-4">
              <Slider
                id="trust-score"
                defaultValue={[0, 100]}
                min={0}
                max={100}
                step={1}
                value={trustRange}
                onValueChange={setTrustRange}
              />
            </div>
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{trustRange[0]}</span>
              <span>{trustRange[1]}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-plan">{t("filters.billing-plan")}</Label>
            <Select
              value={billingPlanFilter}
              onValueChange={setBillingPlanFilter}
            >
              <SelectTrigger id="billing-plan">
                <SelectValue placeholder={t("filters.select-billing-plan")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all-plans")}</SelectItem>
                <SelectItem value="FREE">FREE</SelectItem>
                <SelectItem value="BASIC">BASIC</SelectItem>
                <SelectItem value="PREMIUM">PREMIUM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button
              variant="secondary"
              className="w-full"
              onClick={clearFilters}
            >
              {t("filters.reset-filters")}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <ScrollArea className={cn("overflow-auto", height)}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.email")}</TableHead>
                <TableHead>{t("table.billing-plan")}</TableHead>
                <TableHead>{t("table.role")}</TableHead>
                <TableHead>{t("table.email-verified")}</TableHead>
                {/* <TableHead className="text-right">
                    {t("table.actions")}
                </TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto animate-spin" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {t("table.error-loading-users")}
                  </TableCell>
                </TableRow>
              ) : users.length > 0 ? (
                <>
                  {users.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getBillingPlanBadge(user.billingPlan)}
                        </div>
                      </TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        {user.emailVerified ? (
                          <Badge
                            variant="default"
                            className="flex w-fit items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            {t("table.verified")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="flex w-fit items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            {t("table.unverified")}
                          </Badge>
                        )}
                      </TableCell>

                      {/* <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">
                                {t("table.open-menu")}
                              </span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>
                              {t("table.actions")}
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onSelect={() => {
                                window.location.href = `/profile/${user.username}`;
                              }}
                            >
                              {t("table.view-profile")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                window.location.href = `/profile/${user.username}/edit`;
                              }}
                            >
                              {t("table.edit-user")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell> */}
                    </TableRow>
                  ))}
                  {hasNextPage && (
                    <TableRow ref={loadMoreRef}>
                      <TableCell colSpan={6} className="h-20 text-center">
                        {isFetchingNextPage && (
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {t("table.no-users-found")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {t("showing-users", { count: users.length })}
        </p>
      </div>
    </div>
  );
}
