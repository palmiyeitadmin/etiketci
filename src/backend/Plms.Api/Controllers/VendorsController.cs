using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.DTOs.Vendor;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VendorsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public VendorsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetVendors()
        {
            var vendors = await _context.Vendors
                .Select(v => new VendorDto
                {
                    Id = v.Id,
                    Code = v.Code,
                    Name = v.Name,
                    IsActive = v.IsActive
                })
                .ToListAsync();

            return Ok(new { success = true, data = vendors });
        }

        [HttpGet("{id}")]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetVendor(Guid id)
        {
            var vendor = await _context.Vendors.FindAsync(id);

            if (vendor == null)
            {
                return NotFound(new { success = false, error = "Vendor not found." });
            }

            return Ok(new
            {
                success = true,
                data = new VendorDto
                {
                    Id = vendor.Id,
                    Code = vendor.Code,
                    Name = vendor.Name,
                    IsActive = vendor.IsActive
                }
            });
        }

        [HttpPost]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> CreateVendor(CreateVendorDto dto)
        {
            if (await _context.Vendors.AnyAsync(v => v.Code == dto.Code))
            {
                return BadRequest(new { success = false, error = "Vendor Code already exists." });
            }

            var vendor = new Vendor
            {
                Code = dto.Code,
                Name = dto.Name,
                IsActive = dto.IsActive
            };

            _context.Vendors.Add(vendor);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetVendor), new { id = vendor.Id }, new
            {
                success = true,
                data = new VendorDto
                {
                    Id = vendor.Id,
                    Code = vendor.Code,
                    Name = vendor.Name,
                    IsActive = vendor.IsActive
                }
            });
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> UpdateVendor(Guid id, UpdateVendorDto dto)
        {
            var vendor = await _context.Vendors.FindAsync(id);
            if (vendor == null)
            {
                return NotFound(new { success = false, error = "Vendor not found." });
            }

            vendor.Name = dto.Name;
            vendor.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = vendor });
        }
    }
}
