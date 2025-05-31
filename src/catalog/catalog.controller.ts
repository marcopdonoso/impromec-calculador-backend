import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogService } from './catalog.service';
import { CreateCableTrayDto } from './dto/create-cable-tray.dto';
import { UpdateCableTrayDto } from './dto/update-cable-tray.dto';
import { ImportCableTraysDto } from './dto/import-cable-trays.dto';
import { TrayType, TrayCategory } from './schemas/cable-tray.schema';

@ApiTags('Catalog')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // Endpoints para bandejas portacables
  @Post('cable-trays')
  @ApiOperation({ summary: 'Crear una nueva bandeja portacables' })
  @ApiResponse({ status: 201, description: 'Bandeja portacables creada correctamente' })
  async createCableTray(@Body() createCableTrayDto: CreateCableTrayDto) {
    const cableTray = await this.catalogService.createCableTray(createCableTrayDto);
    return {
      success: true,
      message: 'Bandeja portacables creada correctamente',
      data: cableTray
    };
  }

  @Get('cable-trays')
  @ApiOperation({ summary: 'Obtener todas las bandejas portacables' })
  @ApiQuery({ name: 'type', enum: TrayType, required: false })
  @ApiQuery({ name: 'category', enum: TrayCategory, required: false })
  @ApiResponse({ status: 200, description: 'Lista de bandejas portacables' })
  async findAllCableTrays(
    @Query('type') type?: TrayType,
    @Query('category') category?: TrayCategory
  ) {
    const cableTrays = await this.catalogService.findAllCableTrays(type, category);
    return {
      success: true,
      message: 'Bandejas portacables obtenidas correctamente',
      data: cableTrays
    };
  }

  @Get('cable-trays/:id')
  @ApiOperation({ summary: 'Obtener una bandeja portacables por ID' })
  @ApiResponse({ status: 200, description: 'Bandeja portacables obtenida correctamente' })
  @ApiResponse({ status: 404, description: 'Bandeja portacables no encontrada' })
  async findCableTrayById(@Param('id') id: string) {
    const cableTray = await this.catalogService.findCableTrayById(id);
    return {
      success: true,
      message: 'Bandeja portacables obtenida correctamente',
      data: cableTray
    };
  }

  @Put('cable-trays/:id')
  @ApiOperation({ summary: 'Actualizar una bandeja portacables' })
  @ApiResponse({ status: 200, description: 'Bandeja portacables actualizada correctamente' })
  @ApiResponse({ status: 404, description: 'Bandeja portacables no encontrada' })
  async updateCableTray(
    @Param('id') id: string,
    @Body() updateCableTrayDto: UpdateCableTrayDto
  ) {
    const cableTray = await this.catalogService.updateCableTray(id, updateCableTrayDto);
    return {
      success: true,
      message: 'Bandeja portacables actualizada correctamente',
      data: cableTray
    };
  }

  @Delete('cable-trays/:id')
  @ApiOperation({ summary: 'Eliminar una bandeja portacables' })
  @ApiResponse({ status: 200, description: 'Bandeja portacables eliminada correctamente' })
  @ApiResponse({ status: 404, description: 'Bandeja portacables no encontrada' })
  async removeCableTray(@Param('id') id: string) {
    await this.catalogService.removeCableTray(id);
    return {
      success: true,
      message: 'Bandeja portacables eliminada correctamente'
    };
  }

  // Endpoint para importar bandejas desde Google Sheets
  @Post('cable-trays/import')
  @ApiOperation({ summary: 'Importar bandejas portacables desde Google Sheets' })
  @ApiResponse({ status: 200, description: 'Bandejas portacables importadas correctamente' })
  @ApiResponse({ status: 400, description: 'Error al importar bandejas portacables' })
  async importCableTrays(@Body() importDto: ImportCableTraysDto) {
    const result = await this.catalogService.importCableTraysFromGoogleSheets(importDto);
    return {
      ...result
    };
  }

  // Endpoint para exportar bandejas a Google Sheets
  @Post('cable-trays/export')
  @ApiOperation({ summary: 'Exportar bandejas portacables a Google Sheets' })
  @ApiResponse({ status: 200, description: 'Bandejas portacables exportadas correctamente' })
  @ApiResponse({ status: 400, description: 'Error al exportar bandejas portacables' })
  async exportCableTrays(
    @Body() exportDto: { type: TrayType; targetSheetId: string; sheetName: string }
  ) {
    const result = await this.catalogService.exportCableTraysToGoogleSheets(
      exportDto.type,
      exportDto.targetSheetId,
      exportDto.sheetName
    );
    return {
      ...result
    };
  }
}
