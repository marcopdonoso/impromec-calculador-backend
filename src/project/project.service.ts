import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CalculateTrayDto } from './dto/calculate-tray.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { PdfMonkeyService } from './pdf-monkey.service';
import { Project } from './schemas/project.schema';
import { TrayCalculatorService } from './tray-calculator.service';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    private readonly pdfMonkeyService: PdfMonkeyService,
    private readonly trayCalculatorService: TrayCalculatorService,
  ) {}

  /**
   * Método helper para invalidar el reporte de cálculo de un proyecto
   * @param projectId ID del proyecto
   * @private
   */
  private async invalidateCalculationReport(projectId: string): Promise<void> {
    const project = await this.projectModel.findById(projectId).exec();
    
    // Si hay un reporte existente con fileId, intentar eliminarlo de PDF Monkey
    if (project?.calculationReport?.fileId) {
      try {
        const fileId = project.calculationReport.fileId;
        const deleted = await this.pdfMonkeyService.deleteDocument(fileId);
        if (deleted) {
          this.logger.log(`Documento ${fileId} eliminado de PDF Monkey para proyecto ${projectId}`);
        }
      } catch (error) {
        // No interrumpimos el proceso por un error en la eliminación
        this.logger.error(
          `Error al eliminar documento de PDF Monkey: ${error.message}`,
          error.stack
        );
      }
    }
    
    // Invalidar reporte en la base de datos
    await this.projectModel.findByIdAndUpdate(
      projectId,
      { calculationReport: null }
    ).exec();
  }
  
  /**
   * Invalida el reporte de cálculo de un proyecto estableciéndolo a null
   * y elimina el documento asociado en PDF Monkey
   * @param projectId ID del proyecto
   * @param userId ID del usuario (para verificar permisos)
   * @returns Proyecto actualizado
   */
  async resetCalculationReport(
    projectId: string,
    userId: string,
  ): Promise<Project> {
    // Verificar permisos
    const project = await this.findOne(projectId, userId);
    
    // Si hay un reporte existente con fileId, intentar eliminarlo de PDF Monkey
    if (project.calculationReport?.fileId) {
      try {
        const fileId = project.calculationReport.fileId;
        const deleted = await this.pdfMonkeyService.deleteDocument(fileId);
        if (deleted) {
          this.logger.log(`Documento ${fileId} eliminado de PDF Monkey para proyecto ${projectId}`);
        }
      } catch (error) {
        // No queremos que un error en la eliminación del documento impida
        // la invalidación del reporte en nuestra base de datos
        this.logger.error(
          `Error al eliminar documento de PDF Monkey: ${error.message}`,
          error.stack
        );
      }
    }
    
    // Invalidar reporte
    return this.projectModel.findByIdAndUpdate(
      projectId,
      { calculationReport: null },
      { new: true }
    ).exec();
  }
  
  /**
   * Actualiza el reporte de cálculo de un proyecto
   * @param projectId ID del proyecto
   * @param reportData Datos del reporte (ID del archivo)
   * @param userId ID del usuario (para verificar permisos)
   * @returns Proyecto actualizado
   */
  async updateCalculationReport(
    projectId: string, 
    reportData: { fileId: string },
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    
    return this.projectModel.findByIdAndUpdate(
      projectId,
      { calculationReport: reportData },
      { new: true }
    ).exec();
  }

  async create(
    createProjectDto: CreateProjectDto,
    user: any,
  ): Promise<Project> {
    // Preparar los datos básicos del proyecto
    const projectData = {
      ...createProjectDto,
      user: user.sub, // Usando sub que contiene el ID del usuario desde el JWT
      sectors: [],
    };

    // Si el usuario decidió no dividir el proyecto en sectores, crear un sector por defecto con valores predeterminados
    if (createProjectDto.hasSectors === false) {
      projectData.sectors.push({
        sectorName: 'General',
        trayTypeSelection: 'escalerilla',
        reservePercentage: 30,
        installationLayerSelection: 'singleLayer',
      });
    }

    const newProject = new this.projectModel(projectData);
    return newProject.save();
  }

  async findAll(userId: string): Promise<Project[]> {
    return this.projectModel.find({ user: userId }).exec();
  }

  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.projectModel
      .findOne({ _id: id, user: userId })
      .exec();
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
  ): Promise<Project> {
    const project = await this.projectModel
      .findOneAndUpdate({ _id: id, user: userId }, updateProjectDto, {
        new: true,
      })
      .exec();
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async remove(id: string, userId: string): Promise<void> {
    // Primero obtenemos el proyecto para ver si tiene reporte de cálculo
    const project = await this.findOne(id, userId);
    
    // Si el proyecto tiene un reporte de cálculo con fileId, eliminamos el documento de PDF Monkey
    if (project.calculationReport?.fileId) {
      try {
        this.logger.log(`Eliminando documento PDF Monkey ${project.calculationReport.fileId} al borrar proyecto ${id}`);
        await this.pdfMonkeyService.deleteDocument(project.calculationReport.fileId);
      } catch (error) {
        // Solo registramos el error pero continuamos con la eliminación del proyecto
        this.logger.error(`Error al eliminar documento PDF Monkey ${project.calculationReport.fileId}: ${error.message}`);
      }
    }
    
    // Ahora eliminamos el proyecto
    const result = await this.projectModel
      .deleteOne({ _id: id, user: userId })
      .exec();
      
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }

  // Métodos para manejar sectores
  async addSector(
    projectId: string,
    createSectorDto: CreateSectorDto,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);

    // Asegurar que todos los campos opcionales tengan valores predeterminados
    const sectorData = {
      sectorName: createSectorDto.sectorName,
      trayTypeSelection: createSectorDto.trayTypeSelection || 'escalerilla',
      reservePercentage:
        createSectorDto.reservePercentage !== undefined
          ? createSectorDto.reservePercentage
          : 30,
      installationLayerSelection:
        createSectorDto.installationLayerSelection || 'singleLayer',
    };

    project.sectors.push(sectorData as any);
    await this.invalidateCalculationReport(projectId);
    return project.save();
  }

  async updateSector(
    projectId: string,
    sectorId: string,
    updateSectorDto: UpdateSectorDto,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    const sectorIndex = project.sectors.findIndex(
      (s) => s._id.toString() === sectorId,
    );

    if (sectorIndex === -1) {
      throw new NotFoundException(
        `Sector with ID ${sectorId} not found in project ${projectId}`,
      );
    }

    // Verificar si algún parámetro que afecta al cálculo está siendo actualizado
    const calculationAffectingParams = ['trayTypeSelection', 'reservePercentage', 'installationLayerSelection'];
    const needsResultsReset = Object.keys(updateSectorDto).some(key => 
      calculationAffectingParams.includes(key)
    );
    
    // Actualizar solo los campos proporcionados
    Object.keys(updateSectorDto).forEach((key) => {
      project.sectors[sectorIndex][key] = updateSectorDto[key];
    });
    
    // Si se actualiza algún parámetro que afecta al cálculo, invalidar los resultados
    if (needsResultsReset) {
      console.log(`Invalidando resultados para sector ${sectorId} por actualización de parámetros`);
      project.sectors[sectorIndex].results = null;
      await this.invalidateCalculationReport(projectId);
    }

    return project.save();
  }

  async removeSector(
    projectId: string,
    sectorId: string,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    project.sectors = project.sectors.filter(
      (s) => s._id.toString() !== sectorId,
    );
    await this.invalidateCalculationReport(projectId);
    return project.save();
  }

  // Métodos para manejar cables en un sector
  async addCableToSector(
    projectId: string,
    sectorId: string,
    cableData: any,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    const sectorIndex = project.sectors.findIndex(
      (s) => s._id.toString() === sectorId,
    );

    if (sectorIndex === -1) {
      throw new NotFoundException(
        `Sector with ID ${sectorId} not found in project ${projectId}`,
      );
    }

    if (!project.sectors[sectorIndex].cablesInTray) {
      project.sectors[sectorIndex].cablesInTray = [];
    }

    // Añadir el nuevo cable
    project.sectors[sectorIndex].cablesInTray.push(cableData);
    
    // Invalidar resultados ya que se ha añadido un cable nuevo
    console.log(`Invalidando resultados para sector ${sectorId} por adición de cable`);
    project.sectors[sectorIndex].results = null;
    await this.invalidateCalculationReport(projectId);
    
    return project.save();
  }

  async updateCableInSector(
    projectId: string,
    sectorId: string,
    cableId: string,
    cableData: any,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    const sectorIndex = project.sectors.findIndex(
      (s) => s._id.toString() === sectorId,
    );

    if (sectorIndex === -1) {
      throw new NotFoundException(
        `Sector with ID ${sectorId} not found in project ${projectId}`,
      );
    }

    const cableIndex = project.sectors[sectorIndex].cablesInTray.findIndex(
      (c) => c._id.toString() === cableId,
    );

    if (cableIndex === -1) {
      throw new NotFoundException(
        `Cable with ID ${cableId} not found in sector ${sectorId}`,
      );
    }

    // Verificar si se está modificando algún parámetro que afecte al cálculo
    const calculationAffectingParams = ['cable', 'quantity', 'arrangement'];
    const needsResultsReset = Object.keys(cableData).some(key => 
      calculationAffectingParams.includes(key)
    );

    // Actualizar solo los campos proporcionados
    Object.keys(cableData).forEach((key) => {
      project.sectors[sectorIndex].cablesInTray[cableIndex][key] =
        cableData[key];
    });
    
    // Si se actualiza algún parámetro que afecta al cálculo, invalidar los resultados
    if (needsResultsReset) {
      console.log(`Invalidando resultados para sector ${sectorId} por actualización de cable`);
      project.sectors[sectorIndex].results = null;
      await this.invalidateCalculationReport(projectId);
    }

    return project.save();
  }

  async removeCableFromSector(
    projectId: string,
    sectorId: string,
    cableId: string,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    const sectorIndex = project.sectors.findIndex(
      (s) => s._id.toString() === sectorId,
    );

    if (sectorIndex === -1) {
      throw new NotFoundException(
        `Sector with ID ${sectorId} not found in project ${projectId}`,
      );
    }

    // Verificar si el cable existe antes de eliminarlo
    const cableExists = project.sectors[sectorIndex].cablesInTray.some(
      (c) => c._id.toString() === cableId
    );

    project.sectors[sectorIndex].cablesInTray = project.sectors[
      sectorIndex
    ].cablesInTray.filter((c) => c._id.toString() !== cableId);
    
    // Si el cable existía y fue eliminado, invalidar resultados
    if (cableExists) {
      console.log(`Invalidando resultados para sector ${sectorId} por eliminación de cable`);
      project.sectors[sectorIndex].results = null;
      await this.invalidateCalculationReport(projectId);
    }

    return project.save();
  }

  // Método para actualizar los resultados de un sector
  async updateSectorResults(
    projectId: string,
    sectorId: string,
    resultsData: any,
    userId: string,
  ): Promise<Project> {
    // Primero actualizamos la mayoría de los campos del results
    await this.projectModel
      .updateOne(
        { _id: projectId, user: userId, 'sectors._id': sectorId },
        {
          $set: {
            'sectors.$.results.moreConvenientOption':
              resultsData.moreConvenientOption,
            'sectors.$.results.otherRecommendedOptions':
              resultsData.otherRecommendedOptions,
          },
        },
      )
      .exec();

    // Extrae y convierte explícitamente los valores numéricos a Number
    const loadValue =
      resultsData.calculatedLoadInKgM !== undefined
        ? Number(resultsData.calculatedLoadInKgM)
        : 0;

    const areaValue =
      resultsData.calculatedAreaInMM2 !== undefined
        ? Number(resultsData.calculatedAreaInMM2)
        : 0;

    console.log('Updating calculated values:', {
      load: loadValue,
      area: areaValue,
    });

    // Actualizar específicamente los campos numéricos calculados
    const updatedProject = await this.projectModel
      .findOneAndUpdate(
        { _id: projectId, user: userId, 'sectors._id': sectorId },
        {
          $set: {
            'sectors.$.results.calculatedLoadInKgM': loadValue,
            'sectors.$.results.calculatedAreaInMM2': areaValue,
          },
        },
        { new: true }, // Devolver el documento actualizado
      )
      .exec();

    if (!updatedProject) {
      throw new NotFoundException(
        `Project with ID ${projectId} not found or not accessible`,
      );
    }

    return updatedProject;
  }

  /**
   * Calcula la bandeja óptima y alternativas para un proyecto sin sectores (usa el sector "General")
   * @param projectId ID del proyecto
   * @param calculateTrayDto DTO con los parámetros para el cálculo
   * @param userId ID del usuario (para verificar permisos)
   * @returns Proyecto actualizado con los resultados del cálculo
   */
  async calculateGeneralTray(
    projectId: string,
    calculateTrayDto: CalculateTrayDto,
    userId: string,
  ): Promise<Project> {
    // Obtener primero el proyecto y el ID del sector General
    const project = await this.findOne(projectId, userId);

    // Buscar el sector "General"
    const generalSectorIndex = project.sectors.findIndex(
      (s) => s.sectorName === 'General',
    );

    if (generalSectorIndex === -1) {
      throw new NotFoundException(
        'Este proyecto no tiene un sector "General". Por favor utilice un sector específico.',
      );
    }

    const generalSector = project.sectors[generalSectorIndex];
    const generalSectorId = generalSector._id.toString();

    // Actualizar los parámetros del sector General si se proporcionaron en el DTO
    if (calculateTrayDto && (calculateTrayDto.trayTypeSelection || calculateTrayDto.reservePercentage !== undefined)) {
      const updateFields = {};
      
      // Solo actualizar los campos que se proporcionaron en el DTO
      if (calculateTrayDto.trayTypeSelection) {
        updateFields['sectors.$.trayTypeSelection'] = calculateTrayDto.trayTypeSelection;
      }
      
      if (calculateTrayDto.reservePercentage !== undefined) {
        updateFields['sectors.$.reservePercentage'] = calculateTrayDto.reservePercentage;
      }
      
      // Actualizar solo si hay campos para actualizar
      if (Object.keys(updateFields).length > 0) {
        await this.projectModel
          .updateOne(
            { _id: projectId, user: userId, 'sectors._id': generalSectorId },
            { $set: updateFields },
          )
          .exec();
        
        console.log('Parámetros actualizados:', updateFields);
      } else {
        console.log('No se proporcionaron parámetros para actualizar, usando valores existentes');
      }
    } else {
      console.log('No se proporcionó DTO o está vacío, usando valores existentes');
    }

    // Ahora llamar al método para calcular la bandeja con los parámetros actualizados
    // Pasamos un objeto vacío como DTO para forzar que se realice el cálculo
    return this.calculateSectorTray(projectId, generalSectorId, userId, {});
  }

  /**
   * Calcula la bandeja óptima y alternativas para un sector específico
   * @param projectId ID del proyecto
   * @param sectorId ID del sector
   * @param userId ID del usuario (para verificar permisos)
   * @returns Proyecto actualizado con los resultados del cálculo
   */
  /**
   * Calcula la bandeja óptima y alternativas para un sector específico
   * @param projectId ID del proyecto
   * @param sectorId ID del sector
   * @param userId ID del usuario (para verificar permisos)
   * @param calculateTrayDto DTO opcional con parámetros para el cálculo
   * @returns Proyecto actualizado con los resultados del cálculo
   */
  async calculateSectorTray(
    projectId: string,
    sectorId: string,
    userId: string,
    calculateTrayDto?: CalculateTrayDto,
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    const sectorIndex = project.sectors.findIndex(
      (s) => s._id.toString() === sectorId,
    );

    if (sectorIndex === -1) {
      throw new NotFoundException(
        `Sector with ID ${sectorId} not found in project ${projectId}`,
      );
    }

    const sector = project.sectors[sectorIndex];

    // Verificar que haya cables agregados para realizar el cálculo
    if (!sector.cablesInTray || sector.cablesInTray.length === 0) {
      throw new BadRequestException(
        'El sector debe tener cables agregados para realizar el cálculo',
      );
    }

    // Actualizar parámetros si se proporcionaron en el DTO
    if (calculateTrayDto?.trayTypeSelection) {
      sector.trayTypeSelection = calculateTrayDto.trayTypeSelection;
    }
    
    if (calculateTrayDto?.reservePercentage !== undefined) {
      sector.reservePercentage = calculateTrayDto.reservePercentage;
    }
    
    try {
      // Calcular la bandeja óptima usando el TrayCalculatorService
      const results = await this.trayCalculatorService.calculateOptimalTray(
        sector.trayTypeSelection,
        sector.reservePercentage || 30,
        sector.installationLayerSelection,
        sector.cablesInTray,
      );

      // Verificar los valores calculados
      console.log('Valores calculados a guardar:', {
        load: results.calculatedLoadInKgM,
        area: results.calculatedAreaInMM2,
        reservePercentage: sector.reservePercentage,
        trayType: sector.trayTypeSelection
      });

      // Verificar si se encontraron bandejas adecuadas
      if (!results.moreConvenientOption) {
        throw new BadRequestException(
          'No se encontraron bandejas que cumplan con los requisitos. Intente modificar los parámetros del sector o los cables.',
        );
      }

      // Asegurarnos de convertir a números antes de guardar
      const loadValue = Number(results.calculatedLoadInKgM || 0);
      const areaValue = Number(results.calculatedAreaInMM2 || 0);

      console.log('Números convertidos a guardar:', { loadValue, areaValue });
      
      // Primero, verificar si el objeto results existe en el sector
      // Si no existe, inicializarlo con un objeto vacío
      await this.projectModel.updateOne(
        { 
          _id: projectId, 
          user: userId, 
          'sectors._id': sectorId,
          'sectors.$.results': null  // Condición: results es null
        },
        { 
          $set: { 'sectors.$.results': {} }  // Inicializar results con un objeto vacío
        }
      ).exec();
      
      console.log('Se verificó si el objeto results existe, y se inicializó si era necesario');

      // Preparar los datos a actualizar
      const updateData = {
        'sectors.$.results.moreConvenientOption': results.moreConvenientOption,
        'sectors.$.results.otherRecommendedOptions': results.otherRecommendedOptions,
        'sectors.$.results.calculatedLoadInKgM': loadValue,
        'sectors.$.results.calculatedAreaInMM2': areaValue,
      };

      // Ejecutar operación con Mongoose
      const updatedProject = await this.projectModel
        .findOneAndUpdate(
          { _id: projectId, user: userId, 'sectors._id': sectorId },
          { $set: updateData },
          { new: true },
        )
        .exec();

      // Verificar que el proyecto se haya actualizado correctamente
      if (!updatedProject) {
        throw new NotFoundException(
          `Project with ID ${projectId} not found or not accessible`,
        );
      }

      // Obtener el sector actualizado para mostrar sus resultados
      const updatedSector = updatedProject.sectors.find(
        (s) => s._id.toString() === sectorId,
      );

      console.log('Resultado después de guardar en MongoDB:', {
        success: !!updatedProject,
        sectorUpdated: updatedSector?.results,
        loadGuardado: updatedSector?.results?.calculatedLoadInKgM,
        areaGuardada: updatedSector?.results?.calculatedAreaInMM2,
      });

      return updatedProject;
    } catch (error) {
      console.error('Error al actualizar los resultados:', error);
      throw new Error(`Error al actualizar los resultados: ${error.message}`);
    }
  }
}
