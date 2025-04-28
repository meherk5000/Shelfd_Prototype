"use client";

import React from "react";
import { Layout } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <Layout>
      <div className="container mx-auto py-10 px-4 md:px-0">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Your username"
                  defaultValue="jake"
                  disabled
                />{" "}
                {/* Assuming username is not changeable for now */}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Your email"
                  defaultValue="jake@example.com"
                  disabled
                />{" "}
                {/* Assuming email is not changeable for now */}
              </div>
              <Button disabled>Update Profile</Button>{" "}
              {/* Disabled until functionality is added */}
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                />
              </div>
              <Button disabled>Change Password</Button>{" "}
              {/* Disabled until functionality is added */}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how you receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <Label
                  htmlFor="email-notifications"
                  className="flex flex-col space-y-1"
                >
                  <span>Email Notifications</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    Receive updates and notifications via email.
                  </span>
                </Label>
                <Switch id="email-notifications" defaultChecked disabled />{" "}
                {/* Disabled until functionality is added */}
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label
                  htmlFor="push-notifications"
                  className="flex flex-col space-y-1"
                >
                  <span>Push Notifications</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    Get push notifications on your devices.
                  </span>
                </Label>
                <Switch id="push-notifications" disabled />{" "}
                {/* Disabled until functionality is added */}
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="newsletter" className="flex flex-col space-y-1">
                  <span>Newsletter</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    Subscribe to our newsletter for updates.
                  </span>
                </Label>
                <Switch id="newsletter" defaultChecked disabled />{" "}
                {/* Disabled until functionality is added */}
              </div>
              <Button disabled>Save Preferences</Button>{" "}
              {/* Disabled until functionality is added */}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
