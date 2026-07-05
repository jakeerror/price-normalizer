import { Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";

import { ExportService } from "./export.service";

@Controller("export")
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Get("catalog")
  async catalog(
    @Res({ passthrough: true }) res: Response,
    @Query("format") format: "json" | "csv" = "json",
    @Query("mode") mode: "best" | "all" = "best",
  ) {
    const items = await this.service.getCatalog(mode === "all" ? "all" : "best");
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="catalog.csv"',
      );
      return this.service.toCsv(items);
    }
    return items;
  }
}
