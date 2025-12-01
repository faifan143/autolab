import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { SearchService } from './search.service';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';
import { GlobalSearchResultDto } from './dto/global-search-result.dto';

@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Teacher, UserRole.Admin)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async globalSearch(
    @Query() queryDto: GlobalSearchQueryDto,
  ): Promise<GlobalSearchResultDto> {
    const limit = queryDto.limit ?? 5;
    return this.searchService.search(queryDto.query, limit, queryDto.types);
  }
}


