using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Svezho.Api.Data;

namespace Svezho.Api.Services;

public class TokenService(IConfiguration config)
{
    public const string MasterClaim = "master";

    public static SymmetricSecurityKey Key(IConfiguration config) =>
        new(Encoding.UTF8.GetBytes(config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not set")));

    public string Issue(Master master)
    {
        var token = new JwtSecurityToken(
            issuer: "svezho",
            audience: "svezho",
            claims: [new Claim(MasterClaim, master.Slug), new Claim(ClaimTypes.Name, master.Name)],
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: new SigningCredentials(Key(config), SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
