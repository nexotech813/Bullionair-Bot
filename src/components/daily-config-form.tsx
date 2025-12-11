
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bot, Target, ShieldAlert } from "lucide-react";
import { aiPoweredTradingEngine } from "@/ai/flows/ai-powered-trading-engine";
import { useToast } from "@/hooks/use-toast";
import type { DailyGoal } from "@/lib/types";

const formSchema = z.object({
  type: z.enum(["risk", "profit"], {
    required_error: "You need to select a goal type.",
  }),
  amount: z.coerce.number().positive({ message: "Please enter a positive amount." }),
});

type DailyConfigFormProps = {
  onStartTrading: (goal: DailyGoal, confirmation: string) => void;
};

export function DailyConfigForm({ onStartTrading }: DailyConfigFormProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "profit",
      amount: 1000,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const input = {
      riskLimit: values.type === 'risk' ? values.amount : 500,
      profitTarget: values.type === 'profit' ? values.amount : 1000,
    };

    try {
      const result = await aiPoweredTradingEngine(input);
      toast({
        title: "✅ Trading Engine Activated",
        description: result.confirmationMessage,
      });
      onStartTrading({ type: values.type, value: values.amount }, result.confirmationMessage);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "❌ Activation Failed",
        description: "Could not start the trading engine. Please try again.",
      });
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <Bot /> Daily Morning Setup
            </CardTitle>
            <CardDescription>Configure your trading parameters for today in just 60 seconds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>1. Choose your primary goal for today:</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <FormItem>
                        <Label
                          htmlFor="profit"
                          className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <RadioGroupItem value="profit" id="profit" className="sr-only" />
                          <Target className="mb-3 h-6 w-6" />
                          Set Profit Target
                        </Label>
                      </FormItem>
                      <FormItem>
                        <Label
                          htmlFor="risk"
                          className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <RadioGroupItem value="risk" id="risk" className="sr-only" />
                          <ShieldAlert className="mb-3 h-6 w-6" />
                          Set Risk Limit
                        </Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>2. Set your amount:</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                      <Input type="number" className="pl-7" placeholder="e.g., 1000" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Activating..." : "🚀 AUTO-TRADE TODAY"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
