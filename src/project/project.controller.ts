import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CalculateTrayDto } from './dto/calculate-tray.dto';
import { CreateCableInTrayDto } from './dto/create-cable.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { CalculationReportDto } from './dto/calculation-report.dto';
import { ProjectService } from './project.service';
import { PdfMonkeyService } from './pdf-monkey.service';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly pdfMonkeyService: PdfMonkeyService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'The project has been successfully created.',
  })
  async create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    const newProject = await this.projectService.create(
      createProjectDto,
      req.user,
    );

    const response = {
      success: true,
      message: 'Proyecto creado exitosamente',
      project: {
        id: newProject._id,
        projectName: newProject.projectName,
        projectCompany: newProject.projectCompany,
        projectLocation: newProject.projectLocation,
        hasSectors: createProjectDto.hasSectors || false,
      },
    };

    // Si el proyecto no tiene sectores, incluir información sobre el sector por defecto
    if (
      createProjectDto.hasSectors === false &&
      newProject.sectors &&
      newProject.sectors.length > 0
    ) {
      const defaultSector = newProject.sectors[0];
      response.project['defaultSector'] = {
        id: defaultSector._id,
        sectorName: defaultSector.sectorName,
      };
    }

    return response;
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for the authenticated user' })
  async findAll(@Request() req) {
    const allProjects = await this.projectService.findAll(req.user.sub);

    // Transformar los proyectos para incluir solo los datos necesarios
    const simplifiedProjects = allProjects.map((project) => {
      // Determinar si es un proyecto sin sectores (con sector por defecto "General")
      const isNonSectoredProject =
        project.sectors.length === 1 &&
        project.sectors[0].sectorName === 'General';

      // Convertir el documento de Mongoose a un objeto JavaScript plano
      const projectObj = project.toObject();

      return {
        id: projectObj._id,
        projectName: projectObj.projectName,
        hasSectors: !isNonSectoredProject,
        calculationReport: project.calculationReport,
        sectorsCount: isNonSectoredProject ? 0 : projectObj.sectors.length,
        createdAt: projectObj.createdAt,
        updatedAt: projectObj.updatedAt,
      };
    });

    return {
      success: true,
      projects: simplifiedProjects,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific project by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    const project = await this.projectService.findOne(id, req.user.sub);

    // Determinar si es un proyecto sin sectores personalizados
    // (tiene exactamente un sector llamado "General")
    const isNonSectoredProject =
      project.sectors.length === 1 &&
      project.sectors[0].sectorName === 'General';

    const response = {
      success: true,
      project: {
        id: project._id,
        projectName: project.projectName,
        projectCompany: project.projectCompany,
        projectLocation: project.projectLocation,
        hasSectors: !isNonSectoredProject,
        calculationReport: project.calculationReport,
        // Nota: MongoDB agrega automáticamente createdAt y updatedAt, pero TypeScript no los reconoce
        // Si necesitas estas propiedades, considera agregarlas al esquema o usar una aserción de tipo
      },
    };

    if (isNonSectoredProject) {
      // Para proyectos sin sectores, incluir información sobre el sector por defecto
      // y sus cables directamente en el objeto del proyecto
      const defaultSector = project.sectors[0];
      response.project['defaultSector'] = {
        id: defaultSector._id,
        sectorName: defaultSector.sectorName,
      };
      
      // Incluir parámetros de bandeja y resultados directamente en el proyecto
      response.project['trayTypeSelection'] = defaultSector.trayTypeSelection;
      response.project['reservePercentage'] = defaultSector.reservePercentage;
      response.project['installationLayerSelection'] = defaultSector.installationLayerSelection;
      response.project['cablesCount'] = defaultSector.cablesInTray ? defaultSector.cablesInTray.length : 0;
      response.project['results'] = defaultSector.results;

      if (defaultSector.cablesInTray && defaultSector.cablesInTray.length > 0) {
        response.project['cables'] = defaultSector.cablesInTray.map(
          (cable) => ({
            id: cable._id,
            cable: cable.cable,
            quantity: cable.quantity,
            arrangement: cable.arrangement,
          }),
        );
      } else {
        response.project['cables'] = [];
      }
    } else {
      // Para proyectos con sectores personalizados, incluir el array de sectores completo con sus cables
      response.project['sectors'] = project.sectors.map((sector) => {
        const sectorData = {
          id: sector._id,
          sectorName: sector.sectorName,
          trayTypeSelection: sector.trayTypeSelection,
          reservePercentage: sector.reservePercentage,
          installationLayerSelection: sector.installationLayerSelection,
          cablesCount: sector.cablesInTray ? sector.cablesInTray.length : 0,
          results: sector.results,
          cables: [],
        };

        // Incluir los cables de cada sector
        if (sector.cablesInTray && sector.cablesInTray.length > 0) {
          sectorData.cables = sector.cablesInTray.map((cable) => ({
            id: cable._id,
            cable: cable.cable,
            quantity: cable.quantity,
            arrangement: cable.arrangement,
          }));
        }

        return sectorData;
      });
    }

    return response;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req,
  ) {
    const updatedProject = await this.projectService.update(
      id,
      updateProjectDto,
      req.user.sub,
    );
    return {
      success: true,
      message: 'Proyecto actualizado exitosamente',
      project: updatedProject,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.projectService.remove(id, req.user.sub);
    return {
      success: true,
      message: 'Proyecto eliminado exitosamente',
    };
  }

  @Patch(':id/calculation-report')
  @ApiOperation({ summary: 'Update calculation report for a project' })
  async updateCalculationReport(
    @Param('id') id: string,
    @Body() reportData: CalculationReportDto,
    @Request() req,
  ) {
    const updatedProject = await this.projectService.updateCalculationReport(
      id,
      reportData,
      req.user.sub,
    );
    
    // Añadir campos adicionales como hasSectors para consistencia con GET by id
    const projectResponse = {
      ...updatedProject.toObject(),
      hasSectors: updatedProject.sectors && updatedProject.sectors.length > 0,
    };
    
    return {
      success: true,
      message: 'Reporte de cálculo actualizado exitosamente',
      project: projectResponse,
    };
  }
  
  @Get(':id/calculation-report/download-url')
  @ApiOperation({ summary: 'Get fresh download URL for calculation report' })
  async getCalculationReportDownloadUrl(
    @Param('id') id: string,
    @Request() req,
  ) {
    const project = await this.projectService.findOne(id, req.user.sub);
    
    if (!project.calculationReport?.fileId) {
      // Usar el mismo formato de respuesta que cuando el documento no existe en PDF Monkey
      throw new HttpException(
        {
          success: false,
          message: 'No hay reporte de cálculo disponible para este proyecto',
          needsRegeneration: true
        },
        HttpStatus.NOT_FOUND
      );
    }
    
    try {
      const freshUrl = await this.pdfMonkeyService.generateDownloadUrl(
        project.calculationReport.fileId
      );
      
      return {
        success: true,
        url: freshUrl,
        expiresIn: '1 hour'
      };
    } catch (error) {
      // Si hay error, invalidar el reporte para que se regenere
      console.log(`Error al obtener URL para reporte ${project.calculationReport.fileId}:`, error.message);
      
      // Invalidar el reporte en la base de datos
      await this.projectService.resetCalculationReport(id, req.user.sub);
      
      // Devolver mensaje adecuado al frontend
      throw new HttpException(
        {
          success: false,
          message: 'El reporte ya no está disponible y debe ser regenerado',
          needsRegeneration: true
        },
        HttpStatus.NOT_FOUND
      );
    }
  }

  // Endpoints para manejar sectores
  @Post(':id/sectors')
  @ApiOperation({ summary: 'Add a sector to a project' })
  async addSector(
    @Param('id') id: string,
    @Body() createSectorDto: CreateSectorDto,
    @Request() req,
  ) {
    const updatedProject = await this.projectService.addSector(
      id,
      createSectorDto,
      req.user.sub,
    );
    const newSector = updatedProject.sectors[updatedProject.sectors.length - 1];

    return {
      success: true,
      message: 'Sector creado exitosamente',
      sector: {
        id: newSector._id,
        sectorName: newSector.sectorName,
        projectId: updatedProject._id,
      },
      project: {
        id: updatedProject._id,
        projectName: updatedProject.projectName,
        sectorsCount: updatedProject.sectors.length,
      },
    };
  }

  @Patch(':id/sectors/:sectorId')
  @ApiOperation({ summary: 'Update a sector in a project' })
  async updateSector(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Body() updateSectorDto: UpdateSectorDto,
    @Request() req,
  ) {
    const updatedProject = await this.projectService.updateSector(
      id,
      sectorId,
      updateSectorDto,
      req.user.sub,
    );

    // Encontrar el sector actualizado
    const updatedSector = updatedProject.sectors.find(
      (s) => s._id.toString() === sectorId,
    );
    if (!updatedSector) {
      throw new NotFoundException(`Sector with ID ${sectorId} not found`);
    }

    return {
      success: true,
      message: 'Sector actualizado exitosamente',
      sector: {
        id: updatedSector._id,
        sectorName: updatedSector.sectorName,
        trayTypeSelection: updatedSector.trayTypeSelection,
        reservePercentage: updatedSector.reservePercentage,
        installationLayerSelection: updatedSector.installationLayerSelection,
        cablesCount: updatedSector.cablesInTray
          ? updatedSector.cablesInTray.length
          : 0,
      },
      project: {
        id: updatedProject._id,
        projectName: updatedProject.projectName,
      },
    };
  }

  @Delete(':id/sectors/:sectorId')
  @ApiOperation({ summary: 'Remove a sector from a project' })
  async removeSector(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Request() req,
  ) {
    const updatedProject = await this.projectService.removeSector(
      id,
      sectorId,
      req.user.sub,
    );

    return {
      success: true,
      message: 'Sector eliminado exitosamente',
      project: {
        id: updatedProject._id,
        projectName: updatedProject.projectName,
        sectorsCount: updatedProject.sectors.length,
      },
    };
  }

  // Endpoints para manejar cables directamente en el proyecto (usa el sector por defecto)
  @Post(':id/cables')
  @ApiOperation({
    summary: 'Add a cable directly to a project (uses default sector)',
  })
  async addCableToProject(
    @Param('id') id: string,
    @Body() cableData: CreateCableInTrayDto,
    @Request() req,
  ) {
    const project = await this.projectService.findOne(id, req.user.sub);

    // Verificar si el proyecto no tiene sectores personalizados
    if (project.sectors.length === 0) {
      throw new NotFoundException('El proyecto no tiene un sector por defecto');
    }

    // Usar el primer sector como sector por defecto
    const defaultSectorId = project.sectors[0]._id.toString();

    // Reutilizar el método existente para agregar un cable a un sector
    const updatedProject = await this.projectService.addCableToSector(
      id,
      defaultSectorId,
      cableData,
      req.user.sub,
    );

    // Encontrar el sector actualizado
    const sector = updatedProject.sectors.find(
      (s) => s._id.toString() === defaultSectorId,
    );
    if (!sector) {
      throw new NotFoundException(
        `Sector with ID ${defaultSectorId} not found`,
      );
    }

    // Obtener el cable recién agregado
    const newCable = sector.cablesInTray[sector.cablesInTray.length - 1];

    return {
      success: true,
      message: 'Cable agregado exitosamente al proyecto',
      cable: {
        id: newCable._id,
        cable: newCable.cable,
        quantity: newCable.quantity,
        arrangement: newCable.arrangement,
      },
      project: {
        id: updatedProject._id,
        projectName: updatedProject.projectName,
        cablesCount: sector.cablesInTray.length,
      },
    };
  }

  @Patch(':id/cables/:cableId')
  @ApiOperation({
    summary: 'Update a cable directly in a project (uses default sector)',
  })
  async updateCableInProject(
    @Param('id') id: string,
    @Param('cableId') cableId: string,
    @Body() cableData: any,
    @Request() req,
  ) {
    const project = await this.projectService.findOne(id, req.user.sub);

    // Verificar si el proyecto tiene sectores
    if (project.sectors.length === 0) {
      throw new NotFoundException('El proyecto no tiene un sector por defecto');
    }

    // Usar el primer sector como sector por defecto
    const defaultSectorId = project.sectors[0]._id.toString();

    // Reutilizar el método existente para actualizar un cable en un sector
    const updatedProject = await this.projectService.updateCableInSector(
      id,
      defaultSectorId,
      cableId,
      cableData,
      req.user.sub,
    );

    // Encontrar el sector actualizado
    const sector = updatedProject.sectors.find(
      (s) => s._id.toString() === defaultSectorId,
    );
    if (!sector) {
      throw new NotFoundException(
        `Sector with ID ${defaultSectorId} not found`,
      );
    }

    // Encontrar el cable actualizado
    const updatedCable = sector.cablesInTray.find(
      (c) => c._id.toString() === cableId,
    );
    if (!updatedCable) {
      throw new NotFoundException(`Cable with ID ${cableId} not found`);
    }

    return {
      success: true,
      message: 'Cable actualizado exitosamente',
      cable: {
        id: updatedCable._id,
        cable: updatedCable.cable,
        quantity: updatedCable.quantity,
        arrangement: updatedCable.arrangement,
      },
      project: {
        id: updatedProject._id,
        projectName: updatedProject.projectName,
        cablesCount: sector.cablesInTray.length,
      },
    };
  }

  @Delete(':id/cables/:cableId')
  @ApiOperation({
    summary: 'Remove a cable directly from a project (uses default sector)',
  })
  async removeCableFromProject(
    @Param('id') id: string,
    @Param('cableId') cableId: string,
    @Request() req,
  ) {
    const project = await this.projectService.findOne(id, req.user.sub);

    // Verificar si el proyecto tiene sectores
    if (project.sectors.length === 0) {
      throw new NotFoundException('El proyecto no tiene un sector por defecto');
    }

    // Usar el primer sector como sector por defecto
    const defaultSectorId = project.sectors[0]._id.toString();

    // Reutilizar el método existente para eliminar un cable de un sector
    const updatedProject = await this.projectService.removeCableFromSector(
      id,
      defaultSectorId,
      cableId,
      req.user.sub,
    );

    // Encontrar el sector actualizado
    const sector = updatedProject.sectors.find(
      (s) => s._id.toString() === defaultSectorId,
    );
    if (!sector) {
      throw new NotFoundException(
        `Sector with ID ${defaultSectorId} not found`,
      );
    }

    return {
      success: true,
      message: 'Cable eliminado exitosamente',
      project: {
        id: updatedProject._id,
        projectName: updatedProject.projectName,
        cablesCount: sector.cablesInTray.length,
      },
    };
  }

  // Endpoints para manejar cables en un sector
  @Post(':id/sectors/:sectorId/cables')
  @ApiOperation({ summary: 'Add a cable to a sector' })
  async addCableToSector(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Body() cableData: CreateCableInTrayDto,
    @Request() req,
  ) {
    const updatedProject = await this.projectService.addCableToSector(
      id,
      sectorId,
      cableData,
      req.user.sub,
    );

    // Encontrar el sector actualizado
    const sector = updatedProject.sectors.find(
      (s) => s._id.toString() === sectorId,
    );
    if (!sector) {
      throw new NotFoundException(`Sector with ID ${sectorId} not found`);
    }

    // Obtener el cable recién agregado
    const newCable = sector.cablesInTray[sector.cablesInTray.length - 1];

    return {
      success: true,
      message: 'Cable agregado exitosamente al sector',
      cable: {
        id: newCable._id,
        cable: newCable.cable,
        quantity: newCable.quantity,
        arrangement: newCable.arrangement,
      },
      sector: {
        id: sector._id,
        sectorName: sector.sectorName,
        cablesCount: sector.cablesInTray.length,
      },
      project: {
        id: updatedProject._id,
        projectName: updatedProject.projectName,
      },
    };
  }

  @Patch(':id/sectors/:sectorId/cables/:cableId')
  @ApiOperation({ summary: 'Update a cable in a sector' })
  async updateCableInSector(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Param('cableId') cableId: string,
    @Body() cableData: any,
    @Request() req,
  ) {
    const updatedProject = await this.projectService.updateCableInSector(
      id,
      sectorId,
      cableId,
      cableData,
      req.user.sub,
    );

    // Encontrar el sector actualizado
    const sector = updatedProject.sectors.find(
      (s) => s._id.toString() === sectorId,
    );
    if (!sector) {
      throw new NotFoundException(`Sector with ID ${sectorId} not found`);
    }

    // Encontrar el cable actualizado
    const updatedCable = sector.cablesInTray.find(
      (c) => c._id.toString() === cableId,
    );
    if (!updatedCable) {
      throw new NotFoundException(`Cable with ID ${cableId} not found`);
    }

    return {
      success: true,
      message: 'Cable actualizado exitosamente',
      cable: {
        id: updatedCable._id,
        cable: updatedCable.cable,
        quantity: updatedCable.quantity,
        arrangement: updatedCable.arrangement,
      },
      sector: {
        id: sector._id,
        sectorName: sector.sectorName,
        cablesCount: sector.cablesInTray.length,
      },
    };
  }

  @Delete(':id/sectors/:sectorId/cables/:cableId')
  @ApiOperation({ summary: 'Remove a cable from a sector' })
  async removeCableFromSector(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Param('cableId') cableId: string,
    @Request() req,
  ) {
    const updatedProject = await this.projectService.removeCableFromSector(
      id,
      sectorId,
      cableId,
      req.user.sub,
    );

    // Encontrar el sector actualizado
    const sector = updatedProject.sectors.find(
      (s) => s._id.toString() === sectorId,
    );
    if (!sector) {
      throw new NotFoundException(`Sector with ID ${sectorId} not found`);
    }

    return {
      success: true,
      message: 'Cable eliminado exitosamente',
      sector: {
        id: sector._id,
        sectorName: sector.sectorName,
        cablesCount: sector.cablesInTray.length,
      },
      project: {
        id: updatedProject._id,
        projectName: updatedProject.projectName,
      },
    };
  }

  // Endpoint para actualizar los resultados de un sector
  @Patch(':id/sectors/:sectorId/results')
  @ApiOperation({ summary: 'Update the results of a sector' })
  updateSectorResults(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Body() resultsData: any,
    @Request() req,
  ) {
    return this.projectService.updateSectorResults(
      id,
      sectorId,
      resultsData,
      req.user.sub,
    );
  }

  // Endpoint para calcular la bandeja óptima de un sector
  @Post(':id/sectors/:sectorId/calculate-tray')
  @ApiOperation({ summary: 'Calculate the optimal tray for a sector' })
  async calculateSectorTray(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Body() calculateTrayDto: CalculateTrayDto,
    @Request() req,
  ) {
    try {
      const project = await this.projectService.calculateSectorTray(
        id,
        sectorId,
        req.user.sub,
        calculateTrayDto,
      );

      // Encontrar el sector actualizado en el proyecto
      const sector = project.sectors.find((s) => s._id.toString() === sectorId);

      return {
        success: true,
        message: 'Cálculo de bandeja completado exitosamente',
        data: {
          projectId: project._id,
          sectorId: sectorId,
          sectorName: sector.sectorName,
          results: sector.results,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

  // Endpoint para calcular la bandeja óptima de un proyecto sin sectores (usa el sector "General")
  @Post(':id/calculate-general-tray')
  @ApiOperation({
    summary:
      'Calculate the optimal tray for a project without sectors (uses the "General" sector)',
  })
  async calculateGeneralTray(
    @Param('id') id: string,
    @Body() calculateTrayDto: CalculateTrayDto,
    @Request() req,
  ) {
    try {
      const project = await this.projectService.calculateGeneralTray(
        id,
        calculateTrayDto,
        req.user.sub,
      );

      // Encontrar el sector "General" actualizado
      const generalSector = project.sectors.find(
        (s) => s.sectorName === 'General',
      );

      return {
        success: true,
        message:
          'Cálculo de bandeja completado exitosamente para el sector General',
        data: {
          projectId: project._id,
          sectorId: generalSector._id,
          sectorName: 'General',
          results: generalSector.results,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }
}
