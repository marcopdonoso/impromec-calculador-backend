import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Logger } from '@nestjs/common';

@Injectable()
export class PdfMonkeyService {
  private readonly logger = new Logger(PdfMonkeyService.name);
  private readonly apiKey: string;
  private readonly apiBaseUrl: string = 'https://api.pdfmonkey.io/api/v1';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('PDFMONKEY_API_KEY');
    
    if (!this.apiKey) {
      console.warn('ADVERTENCIA: PDFMONKEY_API_KEY no está configurada');
    }
  }

  /**
   * Genera una URL de descarga fresca para un documento PDF
   * @param documentId ID del documento en PDF Monkey
   * @returns URL de descarga con validez de 1 hora
   */
  async generateDownloadUrl(documentId: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiBaseUrl}/documents/${documentId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        })
      );

      // Extraer la URL de descarga actualizada del documento
      const downloadUrl = response.data.document.download_url;
      
      if (!downloadUrl) {
        throw new HttpException(
          'No se pudo obtener la URL de descarga del documento',
          HttpStatus.NOT_FOUND
        );
      }
      
      return downloadUrl;
    } catch (error) {
      console.error('Error al obtener URL de PDF Monkey:', error.message);
      
      if (error.response?.status === 404) {
        throw new HttpException(
          'El documento solicitado ya no existe en PDF Monkey',
          HttpStatus.NOT_FOUND
        );
      }
      
      throw new HttpException(
        'Error al generar URL de descarga',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Elimina un documento de PDF Monkey
   * @param documentId ID del documento a eliminar
   * @returns true si se eliminó correctamente, false si no existía
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const url = `${this.apiBaseUrl}/documents/${documentId}`;
      
      const response = await firstValueFrom(
        this.httpService.delete(url, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'application/json'
          }
        })
      );
      
      // PDF Monkey devuelve código 204 (No Content) en eliminación exitosa
      return response.status === 204;
    } catch (error) {
      // Si el documento ya no existe (404), lo consideramos como eliminado correctamente
      if (error.response?.status === 404) {
        this.logger.log(`El documento ${documentId} ya no existía en PDF Monkey`);
        return true;
      }
      
      this.logger.error(
        `Error al eliminar documento ${documentId} de PDF Monkey: ${error.message}`,
        error.stack
      );
      return false;
    }
  }
}
