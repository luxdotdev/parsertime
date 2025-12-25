import { getAppSettings, getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

export type GetAppSettingsResponse = {
  id: number;
  userId: string;
  colorblindMode: $Enums.ColorblindMode;
  customTeam1Color?: string;
  customTeam2Color?: string;
  seeOnboarding: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    Logger.warn("Unauthorized request to get app settings API");
    unauthorized();
  }

  try {
    let appSettings = await getAppSettings(session.user.email);

    // If no app settings exist, create default ones
    if (!appSettings) {
      const user = await getUser(session.user.email);
      if (!user) {
        Logger.error("User not found when creating app settings");
        return new Response("User not found", { status: 404 });
      }

      appSettings = await prisma.appSettings.create({
        data: {
          userId: user.id,
          colorblindMode: $Enums.ColorblindMode.OFF,
          seeOnboarding: true,
        },
      });
    }

    const response: GetAppSettingsResponse = {
      id: appSettings.id,
      userId: appSettings.userId,
      colorblindMode: appSettings.colorblindMode,
      customTeam1Color: appSettings.customTeam1Color ?? undefined,
      customTeam2Color: appSettings.customTeam2Color ?? undefined,
      seeOnboarding: appSettings.seeOnboarding,
      createdAt: appSettings.createdAt,
      updatedAt: appSettings.updatedAt,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    Logger.error("Error fetching app settings:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

const updateAppSettingsSchema = z.object({
  colorblindMode: z.enum(Object.values($Enums.ColorblindMode)),
  customTeam1Color: z.string().optional(),
  customTeam2Color: z.string().optional(),
  seeOnboarding: z.boolean(),
});

export type UpdateAppSettingsRequest = z.infer<typeof updateAppSettingsSchema>;

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    Logger.warn("Unauthorized request to update app settings API");
    unauthorized();
  }

  try {
    const body = await request.json();
    const validatedData = updateAppSettingsSchema.parse(body);

    const user = await getUser(session.user.email);
    if (!user) {
      Logger.error("User not found when updating app settings");
      return new Response("User not found", { status: 404 });
    }

    // Try to find existing settings first
    const existingSettings = await prisma.appSettings.findFirst({
      where: { userId: user.id },
    });

    let appSettings;
    if (existingSettings) {
      // Update existing settings
      appSettings = await prisma.appSettings.update({
        where: { id: existingSettings.id },
        data: {
          colorblindMode: validatedData.colorblindMode,
          customTeam1Color: validatedData.customTeam1Color,
          customTeam2Color: validatedData.customTeam2Color,
          seeOnboarding: validatedData.seeOnboarding,
        },
      });
    } else {
      // Create new settings
      appSettings = await prisma.appSettings.create({
        data: {
          userId: user.id,
          colorblindMode: validatedData.colorblindMode,
          customTeam1Color: validatedData.customTeam1Color,
          customTeam2Color: validatedData.customTeam2Color,
          seeOnboarding: validatedData.seeOnboarding,
        },
      });
    }

    const response: GetAppSettingsResponse = {
      id: appSettings.id,
      userId: appSettings.userId,
      colorblindMode: appSettings.colorblindMode,
      customTeam1Color: appSettings.customTeam1Color ?? undefined,
      customTeam2Color: appSettings.customTeam2Color ?? undefined,
      createdAt: appSettings.createdAt,
      updatedAt: appSettings.updatedAt,
      seeOnboarding: appSettings.seeOnboarding,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      Logger.warn("Invalid app settings data:", error.issues);
      return new Response("Invalid request data", { status: 400 });
    }

    Logger.error("Error updating app settings:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
