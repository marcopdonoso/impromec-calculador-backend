import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User } from 'src/auth/user.schema';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
  ) {}

  async create(createProjectDto: CreateProjectDto, user: any): Promise<Project> {
    // Preparar los datos básicos del proyecto
    const projectData = {
      ...createProjectDto,
      user: user.sub, // Usando sub que contiene el ID del usuario desde el JWT
      sectors: [],
    };
    
    // Si el usuario decidió no dividir el proyecto en sectores, crear un sector por defecto
    if (createProjectDto.hasSectors === false) {
      projectData.sectors.push({
        sectorName: 'General',
        // Los demás campos son opcionales y se pueden configurar posteriormente
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
    project.sectors.push(createSectorDto as any);
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
}
