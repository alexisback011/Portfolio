import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const AppDownloadCard = () => (
  <Card data-testid="apk-download-section">
    <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Download className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider">
            𝙰𝚕𝚎𝚡シ <span className="text-muted-foreground">· Android app</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Get the Android app to manage the portfolio on the go.
          </p>
        </div>
      </div>
      <Button asChild className="shrink-0 gap-2" data-testid="apk-download-btn">
        <a href="/AlexAdmin.apk" download>
          <Download className="h-4 w-4" /> Download AlexAdmin.apk
        </a>
      </Button>
    </CardContent>
  </Card>
);

export default AppDownloadCard;
