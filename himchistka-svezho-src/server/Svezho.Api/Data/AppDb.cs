using Microsoft.EntityFrameworkCore;

namespace Svezho.Api.Data;

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<Master> Masters => Set<Master>();
    public DbSet<CleaningRequest> Requests => Set<CleaningRequest>();
    public DbSet<RequestPhoto> Photos => Set<RequestPhoto>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Master>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Slug).HasMaxLength(64);
            e.Property(x => x.Name).HasMaxLength(120);
            e.Property(x => x.Phone).HasMaxLength(32);
        });

        b.Entity<CleaningRequest>(e =>
        {
            e.HasIndex(x => new { x.MasterId, x.Number }).IsUnique();
            e.HasIndex(x => new { x.MasterId, x.CreatedAt });
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
            e.Property(x => x.ClientName).HasMaxLength(80);
            e.Property(x => x.Phone).HasMaxLength(32);
            e.Property(x => x.Address).HasMaxLength(300);
            e.Property(x => x.When).HasMaxLength(80);
            e.Property(x => x.Comment).HasMaxLength(2000);
            e.Property(x => x.Total).HasConversion<double>();
            e.Property(x => x.ClientTotal).HasConversion<double>();
            e.Property(x => x.CreatedAt).HasConversion(v => v.ToUnixTimeMilliseconds(), v => DateTimeOffset.FromUnixTimeMilliseconds(v));
        });

        b.Entity<RequestPhoto>(e =>
        {
            e.Property(x => x.FileName).HasMaxLength(200);
            e.Property(x => x.ContentType).HasMaxLength(64);
        });
    }
}
