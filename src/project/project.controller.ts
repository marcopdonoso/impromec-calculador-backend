import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'The project has been successfully created.' })
  create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    return this.projectService.create(createProjectDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for the current user' })
  findAll(@Request() req) {
    return this.projectService.findAll(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific project by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.projectService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  update(
    @Param('id') id: string, 
    @Body() updateProjectDto: UpdateProjectDto, 
    @Request() req
  ) {
    return this.projectService.update(id, updateProjectDto, req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  remove(@Param('id') id: string, @Request() req) {
    return this.projectService.remove(id, req.user.sub);
  }

  // Endpoints para manejar sectores
  @Post(':id/sectors')
  @ApiOperation({ summary: 'Add a sector to a project' })
  addSector(
    @Param('id') id: string, 
    @Body() createSectorDto: CreateSectorDto, 
    @Request() req
  ) {
    return this.projectService.addSector(id, createSectorDto, req.user.sub);
  }

  @Patch(':id/sectors/:sectorId')
  @ApiOperation({ summary: 'Update a sector in a project' })
  updateSector(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Body() updateSectorDto: UpdateSectorDto,
    @Request() req,
  ) {
    return this.projectService.updateSector(id, sectorId, updateSectorDto, req.user.sub);
  }

  @Delete(':id/sectors/:sectorId')
  @ApiOperation({ summary: 'Remove a sector from a project' })
  removeSector(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Request() req,
  ) {
    return this.projectService.removeSector(id, sectorId, req.user.sub);
  }

  // Endpoints para manejar cables en un sector
  @Post(':id/sectors/:sectorId/cables')
  @ApiOperation({ summary: 'Add a cable to a sector' })
  addCableToSector(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Body() cableData: any,
    @Request() req,
  ) {
    return this.projectService.addCableToSector(id, sectorId, cableData, req.user.sub);
  }

  @Patch(':id/sectors/:sectorId/cables/:cableId')
  @ApiOperation({ summary: 'Update a cable in a sector' })
  updateCableInSector(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Param('cableId') cableId: string,
    @Body() cableData: any,
    @Request() req,
  ) {
    return this.projectService.updateCableInSector(
      id, 
      sectorId, 
      cableId, 
      cableData, 
      req.user.sub
    );
  }

  @Delete(':id/sectors/:sectorId/cables/:cableId')
  @ApiOperation({ summary: 'Remove a cable from a sector' })
  removeCableFromSector(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Param('cableId') cableId: string,
    @Request() req,
  ) {
    return this.projectService.removeCableFromSector(
      id, 
      sectorId, 
      cableId, 
      req.user.sub
    );
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
      req.user.sub
    );
  }
}
