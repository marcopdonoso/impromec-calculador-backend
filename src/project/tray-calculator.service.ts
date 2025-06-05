import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CableTray } from '../catalog/schemas/cable-tray.schema';
import { Tray, TrayCategory } from './schemas/tray.schema';
import { CableInTray } from './schemas/cable.schema';
import { Results } from './schemas/results.schema';
import { InstallationLayerType, TrayType } from './schemas/sector.schema';
import { CableArrangementType } from './schemas/cable.schema';

@Injectable()
export class TrayCalculatorService {
  // Factores de seguridad y constantes
  private readonly WEIGHT_SAFETY_FACTOR = 1.2; // 20% adicional para peso
  private readonly DIMENSION_SAFETY_FACTOR = 1.1; // 10% adicional para dimensiones
  private readonly LADDER_HEIGHT_REDUCTION = 15; // Reducción de altura útil en mm para bandejas tipo escalerilla
  
  constructor(
    @InjectModel(CableTray.name) private cableTrayModel: Model<CableTray>,
  ) {}

  /**
   * Calcula y determina la bandeja idónea y alternativas basado en los datos del sector
   * @param trayType Tipo de bandeja seleccionada ('escalerilla' o 'canal')
   * @param reservePercentage Porcentaje de reserva (ej. 30%)
   * @param installationLayer Tipo de instalación ('singleLayer' o 'multiLayer')
   * @param cablesInTray Arreglo de cables en la bandeja
   * @returns Objeto Results con la opción más conveniente y alternativas
   */
  async calculateOptimalTray(
    trayType: TrayType,
    reservePercentage: number,
    installationLayer: InstallationLayerType,
    cablesInTray: CableInTray[],
  ): Promise<Results> {
    // Si no hay cables, no podemos calcular
    if (!cablesInTray || cablesInTray.length === 0) {
      return {
        moreConvenientOption: null,
        otherRecommendedOptions: [],
        calculatedLoadInKgM: 0,
        calculatedAreaInMM2: 0
      } as Results;
    }

    // Paso 1: Calcular el peso total con factor de seguridad
    const totalWeight = this.calculateTotalWeightWithSafety(cablesInTray);
    // Guardar el peso calculado (sin factor de seguridad) para incluirlo en los resultados
    const calculatedLoad = this.calculateTotalWeight(cablesInTray);

    // 2 y 3. Calcular dimensiones según tipo de instalación
    let requiredWidth = 0;
    let requiredHeight = 0;
    let requiredArea = 0;
    // Variable para almacenar el área calculada sin factores de seguridad
    let calculatedArea = 0;

    if (installationLayer === 'singleLayer') {
      // Determinar si la disposición es horizontal o en trébol
      const horizontalArrangement = this.isHorizontalArrangement(cablesInTray);
      console.log(`Disposición detectada: ${horizontalArrangement ? 'Horizontal' : 'Trébol'}`);
      
      // Calcular el área real de los cables sin factores adicionales
      const rawCablesArea = this.calculateTotalArea(cablesInTray);
      console.log(`Área real ocupada por los cables (sin factores): ${rawCablesArea}mm²`);
      
      if (horizontalArrangement) {
        // Instalación en una sola capa - horizontal
        console.log('Calculando dimensiones para disposición horizontal...');
        const dimensions = this.calculateSingleLayerHorizontalDimensions(
          cablesInTray,
          trayType,
          reservePercentage
        );
        requiredWidth = dimensions.width;
        requiredHeight = dimensions.height;
        calculatedArea = dimensions.width * dimensions.height;
        console.log(`Dimensiones horizontales calculadas: ${requiredWidth}mm x ${requiredHeight}mm = ${calculatedArea}mm²`);
      } else {
        // Instalación en una sola capa - trébol
        console.log('Calculando dimensiones para disposición en trébol...');
        const dimensions = this.calculateSingleLayerCloverDimensions(
          cablesInTray,
          trayType,
          reservePercentage
        );
        requiredWidth = dimensions.width;
        requiredHeight = dimensions.height;
        calculatedArea = dimensions.width * dimensions.height;
        console.log(`Dimensiones trébol calculadas: ${requiredWidth}mm x ${requiredHeight}mm = ${calculatedArea}mm²`);
      }
      
      // Para una sola capa, filtramos por ancho y alto
      const suitableTrays = await this.findSuitableTraysForSingleLayer(
        trayType,
        totalWeight,
        requiredWidth,
        requiredHeight
      );

      if (suitableTrays.length === 0) {
        return {
          moreConvenientOption: null,
          otherRecommendedOptions: [],
          calculatedLoadInKgM: calculatedLoad,
          calculatedAreaInMM2: calculatedArea
        } as Results;
      }

      console.log('Valores finales que se envían al selector:', {
        requiredWidth,
        requiredHeight,
        calculatedLoad,
        calculatedArea
      });
      
      // Seleccionar la bandeja óptima y alternativas para capa única
      const result = this.selectOptimalTraysForSingleLayer(
        suitableTrays, 
        requiredWidth,
        requiredHeight,
        calculatedLoad,
        calculatedArea
      );
      
      console.log('Resultado final devuelto:', {
        load: result.calculatedLoadInKgM,
        area: result.calculatedAreaInMM2
      });
      
      return result;
      
    } else {
      // Instalación en multicapa - calcular área requerida
      requiredArea = this.calculateRequiredArea(cablesInTray, reservePercentage);
      // Para multicapa, también necesitamos aplicar factores al área calculada
      // ya que es lo que se usa para seleccionar la bandeja y guardar en resultados
      calculatedArea = requiredArea;
      
      // Para multicapa, filtramos por área útil
      const suitableTrays = await this.findSuitableTraysForMultiLayer(
        trayType,
        totalWeight,
        requiredArea
      );

      if (suitableTrays.length === 0) {
        return {
          moreConvenientOption: null,
          otherRecommendedOptions: [],
          calculatedLoadInKgM: calculatedLoad,
          calculatedAreaInMM2: calculatedArea
        } as Results;
      }

      // Seleccionar la bandeja óptima y alternativas para multicapa
      return this.selectOptimalTraysForMultiLayer(
        suitableTrays, 
        requiredArea,
        calculatedLoad,
        calculatedArea
      );
    }
  }

  /**
   * Determina si la disposición predominante es horizontal
   */
  private isHorizontalArrangement(cablesInTray: CableInTray[]): boolean {
    const horizontalCount = cablesInTray.filter(
      cable => !cable.arrangement || cable.arrangement === 'horizontal'
    ).length;
    
    return horizontalCount >= cablesInTray.length / 2;
  }

  /**
   * Calcula el peso total de los cables sin factor de seguridad
   */
  private calculateTotalWeight(cablesInTray: CableInTray[]): number {
    return cablesInTray.reduce((sum, cable) => {
      return sum + (cable.cable.weightPerMeterKG * cable.quantity);
    }, 0);
  }

  /**
   * Calcula el peso total de los cables con factor de seguridad
   */
  private calculateTotalWeightWithSafety(cablesInTray: CableInTray[]): number {
    return this.calculateTotalWeight(cablesInTray) * this.WEIGHT_SAFETY_FACTOR;
  }

  /**
   * Calcula dimensiones para instalación en una sola capa horizontal
   */
  private calculateSingleLayerHorizontalDimensions(
    cablesInTray: CableInTray[],
    trayType: TrayType,
    reservePercentage: number,
  ): { width: number, height: number } {
    // Calcular ancho sumando diámetros por cantidad
    let totalWidth = cablesInTray.reduce((width, cable) => {
      return width + (cable.cable.externalDiameterMM * cable.quantity);
    }, 0);
    
    // Aplicar factor de seguridad y reserva al ancho
    totalWidth = totalWidth * this.DIMENSION_SAFETY_FACTOR * (1 + reservePercentage / 100);
    
    // Altura = diámetro del cable más grande
    let maxHeight = Math.max(...cablesInTray.map(cable => 
      cable.cable.externalDiameterMM
    ));
    
    // NOTA: No se aplica la reducción de altura útil de escalerilla en este paso,
    // ya que estamos calculando la altura requerida para los cables
    
    return { width: totalWidth, height: maxHeight };
  }

  /**
   * Calcula dimensiones para instalación en una sola capa con disposición en trébol
   */
  private calculateSingleLayerCloverDimensions(
    cablesInTray: CableInTray[],
    trayType: TrayType,
    reservePercentage: number,
  ): { width: number, height: number } {
    console.log('===== INICIO CÁLCULO DE DIMENSIONES TRÉBOL =====');
    console.log('Datos de entrada:', {
      cablesCount: cablesInTray.length,
      cablesDetails: cablesInTray.map(c => ({
        diameter: c.cable.externalDiameterMM,
        area: c.cable.externalAreaMM2,
        quantity: c.quantity,
        arrangement: c.arrangement
      })),
      trayType,
      reservePercentage
    });
    
    // Agrupar cables por diámetro
    const cablesByDiameter = this.groupCablesByDiameter(cablesInTray);
    console.log('Cables agrupados por diámetro:', cablesByDiameter);
    
    // Calcular ancho total
    let totalWidth = 0;
    console.log('Cálculo de ancho por grupos:');
    for (const [diameterKey, cables] of Object.entries(cablesByDiameter)) {
      const diameter = parseFloat(diameterKey);
      const totalQuantity = cables.reduce((sum, cable) => sum + cable.quantity, 0);
      
      // Calcular cuántos grupos de trébol se forman (cada 3 cables)
      const cloverGroups = Math.ceil(totalQuantity / 3);
      const groupWidth = cloverGroups * 2 * diameter;
      
      console.log(`- Diámetro ${diameter}mm: ${totalQuantity} cables = ${cloverGroups} grupos x 2 x ${diameter}mm = ${groupWidth}mm`);
      
      // Cada grupo ocupa 2 veces el diámetro en ancho
      totalWidth += groupWidth;
    }
    console.log(`Ancho total básico: ${totalWidth}mm`);
    
    // Aplicar factor de seguridad y reserva al ancho
    const widthWithFactors = totalWidth * this.DIMENSION_SAFETY_FACTOR * (1 + reservePercentage / 100);
    console.log(`Ancho con factores: ${totalWidth} x ${this.DIMENSION_SAFETY_FACTOR} x (1 + ${reservePercentage}/100) = ${widthWithFactors}mm`);
    totalWidth = widthWithFactors;
    
    // Altura = 2 veces el diámetro del cable más grande
    let maxDiameter = Math.max(...cablesInTray.map(cable => 
      cable.cable.externalDiameterMM
    ));
    let maxHeight = 2 * maxDiameter;
    console.log(`Altura básica: 2 x ${maxDiameter}mm = ${maxHeight}mm`);
    
    // NOTA: En este paso no se aplica la reducción de altura útil de escalerilla,
    // ya que estamos calculando la altura total necesaria para los cables,
    // no la altura útil disponible en la bandeja
    console.log(`Altura final para disposición en trébol: ${maxHeight}mm`);
    
    // Calcular área resultante
    const resultingArea = totalWidth * maxHeight;
    console.log(`Área rectangular resultante: ${totalWidth} x ${maxHeight} = ${resultingArea}mm²`);
    
    console.log('===== FIN CÁLCULO DE DIMENSIONES TRÉBOL =====');
    
    return { width: totalWidth, height: maxHeight };
  }

  /**
   * Agrupar cables por diámetro para cálculos de disposición en trébol
   */
  private groupCablesByDiameter(cablesInTray: CableInTray[]): Record<string, CableInTray[]> {
    const groups: Record<string, CableInTray[]> = {};
    
    for (const cable of cablesInTray) {
      const diameter = cable.cable.externalDiameterMM.toString();
      if (!groups[diameter]) {
        groups[diameter] = [];
      }
      groups[diameter].push(cable);
    }
    
    return groups;
  }

  /**
   * Calcula el área total que ocupan los cables sin factores ni reserva
   */
  private calculateTotalArea(cablesInTray: CableInTray[]): number {
    return cablesInTray.reduce((sum, cable) => {
      return sum + (cable.cable.externalAreaMM2 * cable.quantity);
    }, 0);
  }

  /**
   * Calcula el área requerida para la instalación multicapa con reserva
   */
  private calculateRequiredArea(cablesInTray: CableInTray[], reservePercentage: number): number {
    // Calcular el área total que ocupan los cables
    const totalArea = this.calculateTotalArea(cablesInTray);
    
    // Aplicar factor de seguridad y porcentaje de reserva
    const areaWithSafety = totalArea * this.DIMENSION_SAFETY_FACTOR;
    const areaWithReserve = areaWithSafety * (1 + reservePercentage / 100);
    
    return areaWithReserve;
  }

  /**
   * Busca bandejas adecuadas para instalación en una sola capa
   */
  private async findSuitableTraysForSingleLayer(
    trayType: TrayType,
    requiredLoadCapacity: number,
    requiredWidth: number,
    requiredHeight: number,
  ): Promise<CableTray[]> {
    // Buscar bandejas que cumplan con capacidad de carga, ancho y alto
    const suitableTrays = await this.cableTrayModel.find({
      type: trayType,
      loadCapacity: { $gte: requiredLoadCapacity },
      width: { $gte: requiredWidth },
      isActive: true,
    }).exec();
    
    // Filtrar por altura, considerando la reducción en escalerillas
    return suitableTrays.filter(tray => {
      if (trayType === 'escalerilla') {
        return tray.height >= requiredHeight;
      } else {
        return tray.height >= requiredHeight;
      }
    });
  }

  /**
   * Busca bandejas adecuadas para instalación multicapa
   */
  private async findSuitableTraysForMultiLayer(
    trayType: TrayType,
    requiredLoadCapacity: number,
    requiredArea: number,
  ): Promise<CableTray[]> {
    // Buscar bandejas que cumplan con capacidad de carga
    const traySizesByLoad = await this.cableTrayModel.find({
      type: trayType,
      loadCapacity: { $gte: requiredLoadCapacity },
      isActive: true,
    }).exec();
    
    // Filtrar por área útil, considerando la reducción en escalerillas
    return traySizesByLoad.filter(tray => {
      let usefulArea;
      if (trayType === 'escalerilla') {
        // Para bandejas tipo escalerilla, el espacio útil es menor que la altura total debido a su estructura
        const usefulHeight = tray.height - (tray.type === 'escalerilla' ? this.LADDER_HEIGHT_REDUCTION : 0);
        usefulArea = tray.width * usefulHeight;
      } else {
        usefulArea = tray.width * tray.height;
      }
      
      return usefulArea >= requiredArea;
    });
  }

  /**
   * Calcula el área útil de una bandeja considerando su tipo
   */
  private calculateUsefulArea(tray: CableTray): number {
    if (tray.type === 'escalerilla') {
      // Para bandejas tipo escalerilla, debemos considerar que parte de la altura
      // se ocupa por la estructura misma de la bandeja
      const usefulHeight = Math.max(0, tray.height - this.LADDER_HEIGHT_REDUCTION);
      return tray.width * usefulHeight;
    } else {
      // Para bandejas tipo canal, toda el área está disponible
      return tray.width * tray.height;
    }
  }

  /**
   * Selecciona la bandeja óptima y alternativas para instalación en una sola capa
   * Ordena por capacidad de carga (menor a mayor) para evitar sobredimensionamiento
   */
  private selectOptimalTraysForSingleLayer(
    suitableTrays: CableTray[],
    requiredWidth: number,
    requiredHeight: number,
    calculatedLoad: number,
    calculatedArea: number,
  ): Results {
    // Copiar para no modificar la original
    const trayCopies = [...suitableTrays];
    
    // Ordenar por capacidad de carga (menor a mayor)
    // para seleccionar la bandeja con menor capacidad que cumpla los requisitos
    trayCopies.sort((a, b) => a.loadCapacity - b.loadCapacity);
    
    // Convertir a formato de resultados
    return this.createResultsFromTrays(trayCopies, calculatedLoad, calculatedArea);
  }

  /**
   * Selecciona la bandeja óptima y alternativas para instalación multicapa
   * Ordena por capacidad de carga (menor a mayor) para evitar sobredimensionamiento
   */
  private selectOptimalTraysForMultiLayer(
    suitableTrays: CableTray[],
    requiredArea: number,
    calculatedLoad: number,
    calculatedArea: number,
  ): Results {
    // Copiar para no modificar la original
    const trayCopies = [...suitableTrays];
    
    // Ordenar por capacidad de carga (menor a mayor)
    // para seleccionar la bandeja con menor capacidad que cumpla los requisitos
    trayCopies.sort((a, b) => a.loadCapacity - b.loadCapacity);
    
    // Convertir a formato de resultados
    return this.createResultsFromTrays(trayCopies, calculatedLoad, calculatedArea);
  }

  /**
   * Crea el objeto Results a partir de las bandejas seleccionadas
   */
  private createResultsFromTrays(
    sortedTrays: CableTray[], 
    calculatedLoad: number, 
    calculatedArea: number
  ): Results {
    console.log('===== CREANDO RESULTADOS FINALES =====');
    console.log('Valores recibidos:', {
      bandejasSugeridas: sortedTrays.length,
      calculatedLoad,
      calculatedArea
    });
    
    if (sortedTrays.length === 0) {
      console.log('No hay bandejas adecuadas disponibles');
      return {
        moreConvenientOption: null,
        otherRecommendedOptions: [],
        calculatedLoadInKgM: calculatedLoad,
        calculatedAreaInMM2: calculatedArea
      } as Results;
    }
    
    // La primera es la óptima
    const optimalTray = this.convertToTrayModel(sortedTrays[0]);
    console.log('Bandeja óptima seleccionada:', optimalTray);
    
    // Las siguientes son alternativas (máximo 3)
    const alternativeTrays = sortedTrays.slice(1, 4).map(tray => 
      this.convertToTrayModel(tray)
    );
    console.log(`${alternativeTrays.length} bandejas alternativas seleccionadas`);
    
    const result = {
      moreConvenientOption: optimalTray,
      otherRecommendedOptions: alternativeTrays,
      calculatedLoadInKgM: calculatedLoad,
      calculatedAreaInMM2: calculatedArea
    } as Results;
    
    console.log('Valores finales en el resultado:', {
      load: result.calculatedLoadInKgM,
      area: result.calculatedAreaInMM2
    });
    console.log('===== FIN CREACIÓN DE RESULTADOS =====');
    
    return result;
  }

  /**
   * Convierte una bandeja del catálogo a modelo Tray
   */
  private convertToTrayModel(catalogTray: CableTray): Tray {
    // Mapear categoría del catálogo al formato esperado por el frontend
    const categoryMap: Record<string, TrayCategory> = {
      'super liviana': 'super-liviana',
      'superliviana': 'super-liviana',
      'super-liviana': 'super-liviana',
      'liviana': 'liviana',
      'semi-pesada': 'semi-pesada',
      'semi pesada': 'semi-pesada',
      'semi pesadas': 'semi-pesada',  // Variante encontrada en la base de datos
      'semipesada': 'semi-pesada',
      'pesada': 'pesada',
      'super pesada': 'super-pesada',
      'superpesada': 'super-pesada',
      'super-pesada': 'super-pesada'
    };
    
    // Normalizar la categoría entrante (a minúsculas y sin espacios extras)
    const normalizedCategory = catalogTray.category?.toLowerCase().trim() || '';
    
    // Log para depurar qué categoría exacta viene del catálogo
    console.log(`Categoría original de bandeja: '${catalogTray.category}'`);
    console.log(`Categoría normalizada: '${normalizedCategory}'`);
    
    // Intentar encontrar una coincidencia exacta primero
    let trayCategory = categoryMap[normalizedCategory];
    
    // Si no hay coincidencia exacta, buscar por coincidencia parcial
    if (!trayCategory) {
      for (const [key, value] of Object.entries(categoryMap)) {
        if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
          trayCategory = value;
          console.log(`Coincidencia parcial encontrada: '${key}' -> '${value}'`);
          break;
        }
      }
    }
    
    // Si aún no hay coincidencia, usar el valor por defecto
    if (!trayCategory) {
      console.log('No se encontró coincidencia para la categoría, usando valor por defecto: liviana');
      trayCategory = 'liviana';
    }
    
    return {
      id: catalogTray._id.toString(),
      trayType: catalogTray.type,
      trayCategory: trayCategory,
      technicalDetails: {
        thicknessInMM: catalogTray.thickness,
        widthInMM: catalogTray.width,
        heightInMM: catalogTray.height,
        loadResistanceInKgM: catalogTray.loadCapacity
      }
    } as Tray;
  }
}
