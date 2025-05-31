
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CableTray, TrayType, TrayCategory } from './schemas/cable-tray.schema';
import { CreateCableTrayDto } from './dto/create-cable-tray.dto';
import { UpdateCableTrayDto } from './dto/update-cable-tray.dto';
import { ImportCableTraysDto } from './dto/import-cable-trays.dto';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CatalogService {
  private readonly sheets: any;

  constructor(
    @InjectModel(CableTray.name) private cableTrayModel: Model<CableTray>,
    private readonly configService: ConfigService,
  ) {
    // Inicializar Google Sheets API
    this.sheets = google.sheets({ 
      version: 'v4', 
      auth: this.configService.get<string>('GOOGLE_API_KEY') 
    });
  }

  // Métodos CRUD para bandejas portacables
  async createCableTray(createCableTrayDto: CreateCableTrayDto): Promise<CableTray> {
    const newCableTray = new this.cableTrayModel(createCableTrayDto);
    return newCableTray.save();
  }

  async findAllCableTrays(type?: TrayType, category?: TrayCategory): Promise<CableTray[]> {
    const query: any = { isActive: true };
    
    if (type) {
      query.type = type;
    }
    
    if (category) {
      query.category = category;
    }
    
    return this.cableTrayModel.find(query).exec();
  }

  async findCableTrayById(id: string): Promise<CableTray> {
    const cableTray = await this.cableTrayModel.findById(id).exec();
    if (!cableTray) {
      throw new NotFoundException(`Bandeja portacables con ID ${id} no encontrada`);
    }
    return cableTray;
  }

  async updateCableTray(id: string, updateCableTrayDto: UpdateCableTrayDto): Promise<CableTray> {
    const updatedCableTray = await this.cableTrayModel
      .findByIdAndUpdate(id, updateCableTrayDto, { new: true })
      .exec();
    
    if (!updatedCableTray) {
      throw new NotFoundException(`Bandeja portacables con ID ${id} no encontrada`);
    }
    
    return updatedCableTray;
  }

  async removeCableTray(id: string): Promise<void> {
    const result = await this.cableTrayModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Bandeja portacables con ID ${id} no encontrada`);
    }
  }

  // Método para importar bandejas desde Google Sheets
  async importCableTraysFromGoogleSheets(importDto: ImportCableTraysDto): Promise<{ 
    success: boolean; 
    message: string; 
    imported: number;
    errors?: any[];
  }> {
    try {
      // Extraer el ID de la hoja de la URL
      const sheetId = this.extractSheetId(importDto.sourceUrl);
      if (!sheetId) {
        throw new BadRequestException('URL de Google Sheets inválida');
      }

      // Construir el rango a consultar
      const range = importDto.range 
        ? `${importDto.sheetName}!${importDto.range}` 
        : importDto.sheetName;

      // Obtener datos de Google Sheets
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new BadRequestException('No se encontraron datos en la hoja especificada');
      }

      // La primera fila contiene los encabezados
      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Si se solicita reemplazar datos existentes, eliminar los del mismo tipo
      if (importDto.replaceExisting) {
        await this.cableTrayModel.deleteMany({ type: importDto.trayType }).exec();
      }

      // Encontrar índices de columnas según los encabezados
      const tipoIndex = this.findColumnIndex(headers, ['Tipo', 'tipo', 'type']);
      const categoriaIndex = this.findColumnIndex(headers, ['Categoría', 'categoria', 'category']);
      const espesorIndex = this.findColumnIndex(headers, ['Espesor de plancha (en mm)', 'espesor', 'thickness']);
      const altoIndex = this.findColumnIndex(headers, ['Alto de bandeja (en mm)', 'alto', 'height']);
      const anchoIndex = this.findColumnIndex(headers, ['Ancho de Bandeja (en mm)', 'ancho', 'width']);
      const cargaIndex = this.findColumnIndex(headers, ['Carga de Servicio (en kg/ml)', 'carga', 'loadcapacity']);

      // Validar que existan las columnas requeridas
      if (tipoIndex === -1 || categoriaIndex === -1 || espesorIndex === -1 || 
          altoIndex === -1 || anchoIndex === -1 || cargaIndex === -1) {
        throw new BadRequestException('La hoja no contiene todas las columnas requeridas');
      }

      // Mapear filas a objetos de bandeja portacables
      const cableTrays = dataRows.map(row => {
        // En caso de que el tipo no coincida con el solicitado en importDto, usamos el de la fila
        const rowType = row[tipoIndex]?.toString().toLowerCase().trim();
        const type = rowType === 'escalerilla' ? TrayType.LADDER : 
                    rowType === 'canal' ? TrayType.CHANNEL : 
                    importDto.trayType;

        // Categoría (normalizada)
        const categoryText = row[categoriaIndex]?.toString().toLowerCase().trim();
        let category: TrayCategory;
        if (categoryText.includes('super')) {
          category = TrayCategory.SUPER_LIGHT;
        } else if (categoryText.includes('liviana')) {
          category = TrayCategory.LIGHT;
        } else if (categoryText.includes('semi')) {
          category = TrayCategory.SEMI_HEAVY;
        } else if (categoryText.includes('pesada')) {
          category = TrayCategory.HEAVY;
        } else {
          category = categoryText as TrayCategory;
        }

        // Valores numéricos
        const thickness = this.parseNumber(row[espesorIndex]);
        const height = this.parseNumber(row[altoIndex]);
        const width = this.parseNumber(row[anchoIndex]);
        const loadCapacity = this.parseNumber(row[cargaIndex]);

        const cableTrayData: any = {
          type,
          category,
          thickness,
          height,
          width,
          loadCapacity,
          isActive: true
        };

        // Opcionalmente agregamos campos adicionales que pudieran estar en la hoja
        // pero que no son obligatorios para nuestro modelo
        headers.forEach((header, index) => {
          if (index < row.length && row[index] !== '' && row[index] !== undefined) {
            const headerText = header.toString().toLowerCase().trim();
            
            // Campos opcionales específicos
            if (headerText.includes('código') || headerText === 'code') {
              cableTrayData.code = row[index];
            } else if (headerText.includes('nombre') || headerText === 'name') {
              cableTrayData.name = row[index];
            } else if (headerText.includes('largo') || headerText === 'length') {
              cableTrayData.length = this.parseNumber(row[index]);
            } else if (headerText.includes('material')) {
              cableTrayData.material = row[index];
            } else if (headerText.includes('acabado') || headerText === 'finish') {
              cableTrayData.finish = row[index];
            } else if (headerText.includes('área') || headerText.includes('area') || headerText === 'usefularea') {
              cableTrayData.usefulArea = this.parseNumber(row[index]);
            } else if (headerText.includes('imagen') || headerText === 'imageurl') {
              cableTrayData.imageUrl = row[index];
            } else if (headerText.includes('ficha') || headerText === 'datasheeturl') {
              cableTrayData.dataSheetUrl = row[index];
            } else if (!this.isStandardField(headerText)) {
              // Campos adicionales no estándar
              if (!cableTrayData.additionalProperties) {
                cableTrayData.additionalProperties = {};
              }
              cableTrayData.additionalProperties[header] = row[index];
            }
          }
        });

        return cableTrayData;
      });

      // Validar y filtrar datos
      const validCableTrays = cableTrays.filter(tray => 
        tray.type && tray.category && 
        tray.thickness > 0 && tray.height > 0 && 
        tray.width > 0 && tray.loadCapacity > 0
      );

      const invalidTrays = cableTrays.length - validCableTrays.length;
      const errors = invalidTrays > 0 ? [{ 
        invalidRows: invalidTrays,
        reason: 'Falta algún campo requerido o tiene un valor inválido'
      }] : undefined;

      // Guardar en la base de datos
      if (validCableTrays.length > 0) {
        await this.cableTrayModel.insertMany(validCableTrays);
      }

      return {
        success: validCableTrays.length > 0,
        message: validCableTrays.length > 0 
          ? `Se importaron ${validCableTrays.length} bandejas portacables de tipo ${importDto.trayType}` 
          : 'No se importaron bandejas portacables. Revisa el formato de los datos.',
        imported: validCableTrays.length,
        errors
      };
    } catch (error) {
      throw new BadRequestException(`Error al importar datos: ${error.message}`);
    }
  }

  // Método para exportar bandejas a Google Sheets
  async exportCableTraysToGoogleSheets(type: TrayType, targetSheetId: string, sheetName: string): Promise<{ 
    success: boolean; 
    message: string; 
    exported: number;
  }> {
    try {
      // Obtener bandejas del tipo especificado
      const cableTrays = await this.findAllCableTrays(type);
      
      if (cableTrays.length === 0) {
        return {
          success: false,
          message: `No hay bandejas portacables de tipo ${type} para exportar`,
          exported: 0
        };
      }

      // Definir encabezados según la estructura de datos real
      const headers = [
        'Tipo', 'Categoría', 'Espesor de plancha (en mm)', 'Alto de bandeja (en mm)', 
        'Ancho de Bandeja (en mm)', 'Carga de Servicio (en kg/ml)'
      ];

      // Convertir objetos a filas
      const rows = cableTrays.map(tray => [
        tray.type,
        tray.category,
        tray.thickness,
        tray.height,
        tray.width,
        tray.loadCapacity
      ]);

      // Preparar datos para Google Sheets
      const values = [headers, ...rows];

      // Actualizar hoja de cálculo
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: targetSheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        resource: {
          values
        }
      });

      return {
        success: true,
        message: `Se exportaron ${cableTrays.length} bandejas portacables de tipo ${type}`,
        exported: cableTrays.length
      };
    } catch (error) {
      throw new BadRequestException(`Error al exportar datos: ${error.message}`);
    }
  }

  // Método auxiliar para extraer ID de hoja de Google Sheets desde URL
  private extractSheetId(url: string): string | null {
    // Patrones comunes de URLs de Google Sheets
    const patterns = [
      /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
      /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Si la URL no coincide con los patrones pero parece un ID válido
    if (/^[a-zA-Z0-9_-]+$/.test(url)) {
      return url;
    }

    return null;
  }

  // Método auxiliar para encontrar el índice de una columna por varios nombres posibles
  private findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const index = headers.findIndex(header => 
        header.toString().toLowerCase().trim().includes(name.toLowerCase())
      );
      if (index !== -1) {
        return index;
      }
    }
    return -1;
  }

  // Método auxiliar para convertir un valor a número
  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    // Eliminar caracteres no numéricos excepto punto decimal
    const cleaned = value.toString().replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
  }

  // Método auxiliar para determinar si un campo es estándar en nuestro modelo
  private isStandardField(field: string): boolean {
    const standardFields = [
      'tipo', 'type', 
      'categoría', 'categoria', 'category',
      'espesor', 'thickness',
      'alto', 'height',
      'ancho', 'width',
      'carga', 'loadcapacity',
      'código', 'code',
      'nombre', 'name',
      'largo', 'length',
      'material',
      'acabado', 'finish',
      'área', 'area', 'usefularea',
      'imagen', 'imageurl',
      'ficha', 'datasheeturl'
    ];
    
    return standardFields.some(standard => field.includes(standard));
  }
}
