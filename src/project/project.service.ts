import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CalculateTrayDto } from './dto/calculate-tray.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User } from 'src/auth/user.schema';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { TrayCalculatorService } from './tray-calculator.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    private readonly trayCalculatorService: TrayCalculatorService,
  ) {}

  async create(createProjectDto: CreateProjectDto, user: any): Promise<Project> {
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
    const project = await this.projectModel.findOne({ _id: id, user: userId }).exec();
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string): Promise<Project> {
    const project = await this.projectModel
      .findOneAndUpdate({ _id: id, user: userId }, updateProjectDto, { new: true })
      .exec();
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.projectModel.deleteOne({ _id: id, user: userId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }

  // Métodos para manejar sectores
  async addSector(projectId: string, createSectorDto: CreateSectorDto, userId: string): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    
    // Asegurar que todos los campos opcionales tengan valores predeterminados
    const sectorData = {
      sectorName: createSectorDto.sectorName,
      trayTypeSelection: createSectorDto.trayTypeSelection || 'escalerilla',
      reservePercentage: createSectorDto.reservePercentage !== undefined ? createSectorDto.reservePercentage : 30,
      installationLayerSelection: createSectorDto.installationLayerSelection || 'singleLayer',
    };
    
    project.sectors.push(sectorData as any);
    return project.save();
  }

  async updateSector(projectId: string, sectorId: string, updateSectorDto: UpdateSectorDto, userId: string): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    const sectorIndex = project.sectors.findIndex(s => s._id.toString() === sectorId);
    
    if (sectorIndex === -1) {
      throw new NotFoundException(`Sector with ID ${sectorId} not found in project ${projectId}`);
    }
    
    // Actualizar solo los campos proporcionados
    Object.keys(updateSectorDto).forEach(key => {
      project.sectors[sectorIndex][key] = updateSectorDto[key];
    });
    
    return project.save();
  }

  async removeSector(projectId: string, sectorId: string, userId: string): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    project.sectors = project.sectors.filter(s => s._id.toString() !== sectorId);
    return project.save();
  }

  // Métodos para manejar cables en un sector
  async addCableToSector(projectId: string, sectorId: string, cableData: any, userId: string): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    const sectorIndex = project.sectors.findIndex(s => s._id.toString() === sectorId);
    
    if (sectorIndex === -1) {
      throw new NotFoundException(`Sector with ID ${sectorId} not found in project ${projectId}`);
    }
    
    if (!project.sectors[sectorIndex].cablesInTray) {
      project.sectors[sectorIndex].cablesInTray = [];
    }
    
    project.sectors[sectorIndex].cablesInTray.push(cableData);
    return project.save();
  }

  async updateCableInSector(
    projectId: string, 
    sectorId: string, 
    cableId: string, 
    cableData: any, 
    userId: string
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    const sectorIndex = project.sectors.findIndex(s => s._id.toString() === sectorId);
    
    if (sectorIndex === -1) {
      throw new NotFoundException(`Sector with ID ${sectorId} not found in project ${projectId}`);
    }
    
    const cableIndex = project.sectors[sectorIndex].cablesInTray.findIndex(
      c => c._id.toString() === cableId
    );
    
    if (cableIndex === -1) {
      throw new NotFoundException(`Cable with ID ${cableId} not found in sector ${sectorId}`);
    }
    
    // Actualizar solo los campos proporcionados
    Object.keys(cableData).forEach(key => {
      project.sectors[sectorIndex].cablesInTray[cableIndex][key] = cableData[key];
    });
    
    return project.save();
  }

  async removeCableFromSector(
    projectId: string, 
    sectorId: string, 
    cableId: string, 
    userId: string
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    const sectorIndex = project.sectors.findIndex(s => s._id.toString() === sectorId);
    
    if (sectorIndex === -1) {
      throw new NotFoundException(`Sector with ID ${sectorId} not found in project ${projectId}`);
    }
    
    project.sectors[sectorIndex].cablesInTray = project.sectors[sectorIndex].cablesInTray.filter(
      c => c._id.toString() !== cableId
    );
    
    return project.save();
  }

  // Método para actualizar los resultados de un sector
  async updateSectorResults(
    projectId: string, 
    sectorId: string, 
    resultsData: any, 
    userId: string
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    const sectorIndex = project.sectors.findIndex(s => s._id.toString() === sectorId);
    
    if (sectorIndex === -1) {
      throw new NotFoundException(`Sector with ID ${sectorId} not found in project ${projectId}`);
    }
    
    project.sectors[sectorIndex].results = resultsData;
    return project.save();
  }

  /**
   * Calcula la bandeja óptima y alternativas para un proyecto sin sectores (usa el sector "General")
   * @param projectId ID del proyecto
   * @param userId ID del usuario (para verificar permisos)
   * @returns Proyecto actualizado con los resultados del cálculo
   */
  async calculateGeneralTray(
    projectId: string,
    calculateTrayDto: CalculateTrayDto,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    
    // Buscar el sector "General"
    const generalSectorIndex = project.sectors.findIndex(s => s.sectorName === 'General');
    
    if (generalSectorIndex === -1) {
      throw new NotFoundException('Este proyecto no tiene un sector "General". Por favor utilice un sector específico.');
    }
    
    // Actualizar los parámetros del sector General
    const generalSector = project.sectors[generalSectorIndex];
    
    // Actualizar tipo de bandeja y porcentaje de reserva
    project.sectors[generalSectorIndex].trayTypeSelection = calculateTrayDto.trayTypeSelection;
    if (calculateTrayDto.reservePercentage !== undefined) {
      project.sectors[generalSectorIndex].reservePercentage = calculateTrayDto.reservePercentage;
    }
    
    // Guardar los cambios en el proyecto
    await project.save();
    
    // Llamar al método existente con el índice del sector "General"
    return this.calculateSectorTray(projectId, generalSector._id.toString(), userId);
  }

  /**
   * Calcula la bandeja óptima y alternativas para un sector específico
   * @param projectId ID del proyecto
   * @param sectorId ID del sector
   * @param userId ID del usuario (para verificar permisos)
   * @returns Proyecto actualizado con los resultados del cálculo
   */
  async calculateSectorTray(
    projectId: string,
    sectorId: string,
    userId: string,
    calculateTrayDto?: CalculateTrayDto,
  ): Promise<Project> {
    const project = await this.findOne(projectId, userId);
    const sectorIndex = project.sectors.findIndex(s => s._id.toString() === sectorId);
    
    if (sectorIndex === -1) {
      throw new NotFoundException(`Sector with ID ${sectorId} not found in project ${projectId}`);
    }
    
    const sector = project.sectors[sectorIndex];
    
    // Actualizar tipo de bandeja y porcentaje de reserva si se proporcionan
    if (calculateTrayDto) {
      sector.trayTypeSelection = calculateTrayDto.trayTypeSelection;
      if (calculateTrayDto.reservePercentage !== undefined) {
        sector.reservePercentage = calculateTrayDto.reservePercentage;
      }
      // Guardar los cambios en el proyecto
      await project.save();
    }
    
    // Verificar que el sector tenga toda la información necesaria
    if (!sector.trayTypeSelection || !sector.installationLayerSelection) {
      throw new BadRequestException('El sector debe tener un tipo de bandeja y una forma de instalación seleccionados');
    }

    // Verificar que haya cables en el sector
    if (!sector.cablesInTray || sector.cablesInTray.length === 0) {
      throw new BadRequestException('El sector debe tener cables agregados para realizar el cálculo');
    }
    
    // Calcular la bandeja óptima usando el TrayCalculatorService
    const results = await this.trayCalculatorService.calculateOptimalTray(
      sector.trayTypeSelection,
      sector.reservePercentage || 30,
      sector.installationLayerSelection,
      sector.cablesInTray,
    );
    
    // Verificar si se encontraron bandejas adecuadas
    if (!results.moreConvenientOption) {
      throw new BadRequestException('No se encontraron bandejas que cumplan con los requisitos. Intente modificar los parámetros del sector o los cables.');
    }
    
    // Actualizar los resultados en el sector
    project.sectors[sectorIndex].results = results;
    
    // Guardar el proyecto actualizado
    return project.save();
  }
}
